"""NUC builder: pure. Values from docs/DIGIFACT_EVALUATION.md §2 (verified sandbox request)."""
from datetime import datetime, timedelta, timezone

import pytest

from app.fiscal.models import FiscalConfigError, FiscalTotalsMismatch
from app.fiscal.nuc import build_nuc

TZ = timezone(timedelta(hours=-5))
AT = datetime(2026, 10, 21, 10, 41, 44, tzinfo=TZ)

ORG = {"fiscal": {"enabled": True, "env": "test", "ruc": "155704849-2-2021", "dv": "32", "taxIdType": "2",
                  "legalName": "Pick & Eat S.A.", "phone": "997-8242",
                  "defaultCpbsAbr": "50", "defaultCpbsCmp": "5019", "defaultTaxCode": "01"}}
BRANCH = {"name": "El Fogon", "fiscal": {"branchCode": "0001", "billingPoint": "001", "codUbi": "8-8-12",
                                        "coords": "+8.9213,-79.7068", "address": "Blv Costa del Este, PH Financial Tower Piso 17",
                                        "city": "Juan Diaz", "district": "Panama", "state": "Panama", "nextNumber": 5}}
PRODUCTS = {"pz": {"name": "Pizza Margarita"}, "agua": {"name": "Agua", "fiscal": {"taxCode": "00"}}}


def order(**over):
    return {"orgId": "A", "branchId": "b", "total": 21.4, "taxAmount": 1.4, "subtotal": 20,
            "payment": {"method": "cash", "status": "paid"}, **over}


def test_consumidor_final_matches_verified_request():
    items = [{"productId": "pz", "productName": "Pizza Margarita", "quantity": 2, "unitPrice": 10}]
    nuc = build_nuc(order(), items, ORG, BRANCH, PRODUCTS, "0029144443", "795573458", AT, "test")
    assert nuc["Header"]["IssuedDateTime"] == "2026-10-21T10:41:44-05:00"
    assert nuc["Header"]["AdditionalIssueType"] == 2
    info = {i["Name"]: i["Value"] for i in nuc["Header"]["AdditionalIssueDocInfo"]}
    assert info["NumeroDF"] == "0029144443" and info["PtoFactDF"] == "001" and info["CodigoSeguridad"] == "795573458"
    assert nuc["Seller"]["TaxID"] == "155704849-2-2021"
    assert nuc["Seller"]["Name"] == "FE generada en ambiente de pruebas - sin valor comercial ni fiscal"
    assert nuc["Seller"]["BranchInfo"]["Code"] == "0001"
    assert nuc["Buyer"]["TaxID"] == "CF"
    assert {i["Name"]: i["Value"] for i in nuc["Buyer"]["TaxIDAdditionalInfo"]}["TipoReceptor"] == "02"
    item = nuc["Items"][0]
    assert {c["Name"]: c["Value"] for c in item["Codes"]} == {"CodigoProd": "pz", "CodCPBSabr": "50", "CodCPBScmp": "5019"}
    assert item["Qty"] == 2 and item["Price"] == 10.0
    assert item["Taxes"]["Tax"][0] == {"Code": "01", "Description": "ITBMS", "Amount": 1.4}
    assert item["Totals"] == {"TotalBTaxes": 20.0, "TotalWTaxes": 21.4, "SpecificTotal": 21.4, "TotalItem": 21.4}
    assert nuc["Totals"] == {"QtyItems": 1, "GrandTotal": {"TotalBTaxes": 20.0, "TotalWTaxes": 21.4, "InvoiceTotal": 21.4}}
    assert nuc["Payments"] == [{"Type": "02", "Amount": 21.4}]


def test_prod_uses_legal_name_and_env_1():
    org = {"fiscal": {**ORG["fiscal"], "env": "prod"}}
    items = [{"productId": "pz", "quantity": 2, "unitPrice": 10}]
    nuc = build_nuc(order(), items, org, BRANCH, PRODUCTS, "0000000001", "123456789", AT, "prod")
    assert nuc["Header"]["AdditionalIssueType"] == 1
    assert nuc["Seller"]["Name"] == "Pick & Eat S.A."


def test_ruc_buyer():
    items = [{"productId": "pz", "quantity": 2, "unitPrice": 10}]
    o = order(invoiceRequest={"receiverType": "01", "taxId": "155704849-2-2021", "dv": "32", "name": "Digifact", "email": "a@b.co"})
    nuc = build_nuc(o, items, ORG, BRANCH, PRODUCTS, "0000000002", "123456789", AT, "test")
    b = nuc["Buyer"]
    assert b["TaxID"] == "155704849-2-2021" and b["Name"] == "Digifact" and b["TaxIDType"] == "2"
    extra = {i["Name"]: i["Value"] for i in b["TaxIDAdditionalInfo"]}
    assert extra["TipoReceptor"] == "01" and extra["DigitoVerificador"] == "32"
    assert b["Contact"] == {"EmailList": {"Email": ["a@b.co"]}}


def test_ruc_buyer_needs_dv():
    items = [{"productId": "pz", "quantity": 2, "unitPrice": 10}]
    with pytest.raises(FiscalConfigError) as e:
        build_nuc(order(invoiceRequest={"receiverType": "01", "taxId": "1-2-3", "name": "X"}), items, ORG, BRANCH, PRODUCTS, "1", "2", AT, "test")
    assert e.value.field == "invoiceRequest.dv"


def test_exempt_item_and_payment_types():
    items = [{"productId": "pz", "quantity": 1, "unitPrice": 10}, {"productId": "agua", "quantity": 1, "unitPrice": 1}]
    o = order(total=11.7, taxAmount=0.7, subtotal=11, payment={"method": "yappy", "status": "paid"})
    nuc = build_nuc(o, items, ORG, BRANCH, PRODUCTS, "0000000003", "123456789", AT, "test")
    assert nuc["Items"][1]["Taxes"]["Tax"][0] == {"Code": "00", "Description": "ITBMS", "Amount": 0.0}
    assert nuc["Totals"]["GrandTotal"]["InvoiceTotal"] == 11.7
    assert nuc["Payments"][0]["Type"] == "08"


def test_cent_drift_is_absorbed_on_last_taxable_line():
    # 3 × 0.05 at 7 %: per-line tax 0.0035 → 0.00 each; order-level tax 0.15*0.07=0.0105 → 0.01
    items = [{"productId": "pz", "quantity": 1, "unitPrice": 0.05}] * 3
    o = order(total=0.16, taxAmount=0.01, subtotal=0.15)
    nuc = build_nuc(o, items, ORG, BRANCH, PRODUCTS, "0000000004", "123456789", AT, "test")
    taxes = [it["Taxes"]["Tax"][0]["Amount"] for it in nuc["Items"]]
    assert taxes == [0.0, 0.0, 0.01]
    assert nuc["Totals"]["GrandTotal"]["InvoiceTotal"] == 0.16


def test_totals_mismatch_raises():
    items = [{"productId": "pz", "quantity": 2, "unitPrice": 10}]
    with pytest.raises(FiscalTotalsMismatch):
        build_nuc(order(total=50, taxAmount=1.4), items, ORG, BRANCH, PRODUCTS, "1", "2", AT, "test")


def test_missing_cpbs_and_branch_fields():
    org = {"fiscal": {**ORG["fiscal"], "defaultCpbsAbr": "", "defaultCpbsCmp": ""}}
    items = [{"productId": "pz", "quantity": 2, "unitPrice": 10}]
    with pytest.raises(FiscalConfigError) as e:
        build_nuc(order(), items, org, BRANCH, PRODUCTS, "1", "2", AT, "test")
    assert e.value.field == "cpbs"
    with pytest.raises(FiscalConfigError) as e2:
        build_nuc(order(), items, ORG, {"fiscal": {**BRANCH["fiscal"], "codUbi": ""}}, PRODUCTS, "1", "2", AT, "test")
    assert e2.value.field == "branch.fiscal.codUbi"
