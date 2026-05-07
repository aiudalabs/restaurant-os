from fastapi import HTTPException


class OdooAuthError(Exception):
    pass


class OdooRPCError(Exception):
    pass


class FirebaseError(Exception):
    pass


def http_401(detail: str = "Unauthorized") -> HTTPException:
    return HTTPException(status_code=401, detail=detail)


def http_403(detail: str = "Forbidden") -> HTTPException:
    return HTTPException(status_code=403, detail=detail)


def http_502(detail: str) -> HTTPException:
    return HTTPException(status_code=502, detail=detail)
