from .sqliteHelper import getDatabaseCursor


def getChallenge(resource: str):
    _, cursor = getDatabaseCursor()
    rec = cursor.execute(
        "SELECT challenge FROM proofs WHERE resource=?", (resource,)
    ).fetchone()
    return rec[0]


def validateSolution(resource: str, sol: str) -> bool:
    _, cursor = getDatabaseCursor()
    rec = cursor.execute(
        "SELECT solution FROM proofs WHERE resource=?", (resource,)
    ).fetchone()
    if sol == rec[0]:
        return True
    else:
        return False
