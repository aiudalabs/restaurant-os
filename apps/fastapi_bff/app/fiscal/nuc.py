"""Builds the Digifact NUC JSON (V2.0.8, Panamá) for a paid RestaurantOS order.

Pure function: Firestore documents in, dict out. Field ids in comments refer to
Digifact's "Documentación Técnica NUC-JSON Panamá" (A = header, B = seller,
C = buyer, E = items, F = totals, G = payments, H = additional info).
"""
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from app.fiscal.models import FiscalConfigError, FiscalTotalsMismatch

CENT = Decimal("0.01")
# ITBMS rate per DGI tax code (E0911). Restaurants: 01 (7 %) or 00 (exempt).
TAX_RATES = {"00": Decimal("0"), "01": Decimal("0.07"), "02": Decimal("0.10"), "03": Decimal("0.15")}
# payment.method → DGI payment type (G021)
PAYMENT_TYPES = {"cash": "02", "card": "03", "yappy": "08", "transfer": "08"}
TEST_SELLER_NAME = "FE generada en ambiente de pruebas - sin valor comercial ni fiscal"


def money(v: Any) -> Decimal:
    return Decimal(str(v or 0)).quantize(CENT, rounding=ROUND_HALF_UP)


def _info(name: str, value: str) -> dict[str, Any]:
    return {"Name": name, "Data": None, "Value": value}


def _require(d: dict[str, Any], key: str, field: str) -> str:
    v = d.get(key)
    if v is None or (isinstance(v, str) and not v.strip()):
        raise FiscalConfigError(field)
    return str(v).strip()


def _seller(org: dict[str, Any], branch: dict[str, Any], env: str) -> dict[str, Any]:
    of = org.get("fiscal") or {}
    bf = branch.get("fiscal") or {}
    phone = (of.get("phone") or branch.get("phone") or "").strip()
    if not phone:
        raise FiscalConfigError("organization.fiscal.phone")
    name = TEST_SELLER_NAME if env == "test" else _require(of, "legalName", "organization.fiscal.legalName")
    return {
        "TaxID": _require(of, "ruc", "organization.fiscal.ruc"),
        "TaxIDType": _require(of, "taxIdType", "organization.fiscal.taxIdType"),
        "TaxIDAdditionalInfo": [_info("DigitoVerificador", _require(of, "dv", "organization.fiscal.dv"))],
        "Name": name,
        "Contact": {"PhoneList": {"Phone": [phone]}},
        "BranchInfo": {
            "Code": _require(bf, "branchCode", "branch.fiscal.branchCode"),
            "AddressInfo": {
                "Address": _require(bf, "address", "branch.fiscal.address"),
                "City": _require(bf, "city", "branch.fiscal.city"),
                "District": _require(bf, "district", "branch.fiscal.district"),
                "State": _require(bf, "state", "branch.fiscal.state"),
                "Country": "PA",
            },
            "AdditionalBranchInfo": [
                _info("CoordEm", _require(bf, "coords", "branch.fiscal.coords")),
                _info("CodUbi", _require(bf, "codUbi", "branch.fiscal.codUbi")),
            ],
        },
    }


def _buyer(order: dict[str, Any], branch: dict[str, Any]) -> dict[str, Any]:
    bf = branch.get("fiscal") or {}
    req = order.get("invoiceRequest") or {}
    address = {
        "Address": None,
        "City": bf.get("city"),
        "District": bf.get("district"),
        "State": bf.get("state"),
        "Country": "PA",
    }
    if req.get("receiverType") == "01" and req.get("taxId") and req.get("taxId") != "CF":
        if not req.get("dv"):
            raise FiscalConfigError("invoiceRequest.dv")
        buyer: dict[str, Any] = {
            "TaxID": str(req["taxId"]).strip(),
            # Natural (1) / jurídico (2): resolved by GetInfoRuc in the service; default jurídico.
            "TaxIDType": str(req.get("taxIdType") or "2"),
            "TaxIDAdditionalInfo": [
                _info("TipoReceptor", "01"),
                _info("DigitoVerificador", str(req["dv"]).strip()),
                _info("CodUbi", bf.get("codUbi", "")),
            ],
            "Name": str(req.get("name") or "").strip(),
            "Contact": None,
            "AdditionlInfo": [_info("PaisReceptorFE", "PA")],
            "AddressInfo": address,
        }
        if req.get("email"):
            buyer["Contact"] = {"EmailList": {"Email": [req["email"]]}}
        return buyer
    buyer = {
        "TaxID": "CF",
        "TaxIDAdditionalInfo": [_info("TipoReceptor", "02"), _info("CodUbi", bf.get("codUbi", ""))],
        # Consumidor final con nombre (C05) when the customer gave one.
        "Name": req.get("name") if req.get("name") not in (None, "", "Consumidor Final") else None,
        "Contact": None,
        "AdditionlInfo": [_info("PaisReceptorFE", "PA")],
        "AddressInfo": address,
    }
    if req.get("email"):
        buyer["Contact"] = {"EmailList": {"Email": [req["email"]]}}
    return buyer


def _item(
    item: dict[str, Any], product: dict[str, Any], org_fiscal: dict[str, Any]
) -> tuple[dict[str, Any], Decimal, Decimal, Decimal]:
    pf = product.get("fiscal") or {}
    cpbs_abr = (pf.get("cpbsAbr") or org_fiscal.get("defaultCpbsAbr") or "").strip()
    cpbs_cmp = (pf.get("cpbsCmp") or org_fiscal.get("defaultCpbsCmp") or "").strip()
    if not cpbs_abr and not cpbs_cmp:
        raise FiscalConfigError("cpbs")
    tax_code = (pf.get("taxCode") or org_fiscal.get("defaultTaxCode") or "01").strip()
    rate = TAX_RATES.get(tax_code)
    if rate is None:
        raise FiscalConfigError(f"taxCode {tax_code}")

    qty = int(item.get("quantity") or 1)
    unit = money(item.get("unitPrice"))
    base = money(unit * qty)
    tax = money(base * rate)
    total = base + tax
    codes = [_info("CodigoProd", str(item.get("productId") or "")[:20] or "SIN-CODIGO")]
    if cpbs_abr:
        codes.append(_info("CodCPBSabr", cpbs_abr))
    if cpbs_cmp:
        codes.append(_info("CodCPBScmp", cpbs_cmp))
    entry = {
        "Codes": codes,
        "Description": str(item.get("productName") or product.get("name") or "Producto")[:500],
        "Qty": qty,
        "UnitOfMeasure": "und",
        "Price": float(unit),
        "Discounts": None,
        "Taxes": {"Tax": [{"Code": tax_code, "Description": "ITBMS", "Amount": float(tax)}]},
        "Charges": None,
        "Totals": {
            "TotalBTaxes": float(base),
            "TotalWTaxes": float(total),
            "SpecificTotal": float(total),
            "TotalItem": float(total),
        },
        "AdditionalInfo": None,
    }
    if item.get("specialInstructions"):
        entry["AdditionalInfo"] = [_info("InfEmFE", str(item["specialInstructions"])[:500])]
    return entry, base, tax, total


def build_nuc(
    order: dict[str, Any],
    items: list[dict[str, Any]],
    org: dict[str, Any],
    branch: dict[str, Any],
    products: dict[str, dict[str, Any]],
    numero_df: str,
    codigo_seguridad: str,
    issued_at: datetime,
    env: str,
) -> dict[str, Any]:
    if not items:
        raise FiscalConfigError("items")
    of = org.get("fiscal") or {}
    bf = branch.get("fiscal") or {}
    billing_point = _require(bf, "billingPoint", "branch.fiscal.billingPoint")

    entries: list[dict[str, Any]] = []
    sum_base = sum_tax = Decimal("0")
    taxable_idx: int | None = None
    for i, it in enumerate(items):
        entry, base, tax, _ = _item(it, products.get(str(it.get("productId")), {}), of)
        entries.append(entry)
        sum_base += base
        sum_tax += tax
        if entry["Taxes"]["Tax"][0]["Code"] != "00":
            taxable_idx = i

    # The invoice must say exactly what the customer paid. Per-line tax rounding
    # can drift a cent from the order-level tax; absorb that on the last taxable line.
    order_total = money(order.get("total"))
    order_tax = money(order.get("taxAmount"))
    drift = order_tax - sum_tax
    if drift != 0 and taxable_idx is not None and abs(drift) <= Decimal("0.05"):
        e = entries[taxable_idx]
        new_tax = money(Decimal(str(e["Taxes"]["Tax"][0]["Amount"])) + drift)
        new_total = money(Decimal(str(e["Totals"]["TotalBTaxes"])) + new_tax)
        e["Taxes"]["Tax"][0]["Amount"] = float(new_tax)
        e["Totals"].update({"TotalWTaxes": float(new_total), "SpecificTotal": float(new_total), "TotalItem": float(new_total)})
        sum_tax += drift
    grand_total = sum_base + sum_tax
    if abs(grand_total - order_total) > Decimal("0.01"):
        raise FiscalTotalsMismatch(f"invoice {grand_total} != order {order_total}")

    method = (order.get("payment") or {}).get("method") or "cash"
    return {
        "Version": "1.00",
        "CountryCode": "PA",
        "Header": {
            "DocType": "01",
            "IssuedDateTime": issued_at.replace(microsecond=0).isoformat(),
            "AdditionalIssueType": 2 if env == "test" else 1,
            "AdditionalIssueDocInfo": [
                _info("TipoEmision", "01"),
                _info("NumeroDF", numero_df),
                _info("PtoFactDF", billing_point),
                _info("CodigoSeguridad", codigo_seguridad),
                _info("NaturalezaOperacion", "01"),
                _info("TipoOperacion", "1"),
                _info("DestinoOperacion", "1"),
                _info("FormatoGeneracion", "1"),
                _info("ManeraEntrega", "1"),
                _info("EnvioContenedor", "1"),
                _info("ProcesoGeneracion", "1"),
                _info("TipoTransaccion", "1"),
                _info("TipoSucursal", "2"),
            ],
        },
        "Seller": _seller(org, branch, env),
        "Buyer": _buyer(order, branch),
        "ThirdParties": None,
        "Items": entries,
        "Charges": None,
        "Totals": {
            "QtyItems": len(entries),
            "GrandTotal": {
                "TotalBTaxes": float(sum_base),
                "TotalWTaxes": float(grand_total),
                "InvoiceTotal": float(grand_total),
            },
        },
        "Payments": [{"Type": PAYMENT_TYPES.get(method, "99"), "Amount": float(grand_total),
                      **({"Description": f"Pago {method}"} if PAYMENT_TYPES.get(method) is None else {})}],
        "AdditionalDocumentInfo": {"AdditionalInfo": [{"AditionalInfo": [_info("TiempoPago", "1")]}]},
    }
