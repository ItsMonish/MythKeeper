from .SSSA import sssa
from .sqliteHelper import getDatabaseCursor

sss = sssa.sssa()


def createShares(txt: str) -> list:
    print(txt)
    return sss.create(2, 3, txt)


def combineShares(share: str, username: str, resHash: str) -> str:
    shares = [share]
    _, dbCursor = getDatabaseCursor()
    rec = dbCursor.execute(
        "SELECT share FROM serverShares WHERE reshash=? AND username=?",
        (
            resHash,
            username,
        ),
    ).fetchone()
    shares.append(rec[0])
    return sss.combine(shares)


def getSharedChallenge(resHash: str, username: str) -> str:
    _, dbCursor = getDatabaseCursor()
    rec = dbCursor.execute(
        "SELECT challenge FROM serverShares WHERE reshash=? AND username=?",
        (
            resHash,
            username,
        ),
    ).fetchone()
    return rec[0]


def verifySharedSolution(resHash: str, solution: str, username: str) -> bool:
    _, dbCursor = getDatabaseCursor()
    rec = dbCursor.execute(
        "SELECT solution FROM serverShares WHERE reshash=? AND username=?",
        (
            resHash,
            username,
        ),
    ).fetchone()
    if rec[0] == solution:
        return True
    else:
        return False


def storeSeverShares(username: str, share: str, challenge: str, resHash: str) -> None:
    con, dbCursor = getDatabaseCursor()
    dbCursor.execute(
        "INSERT INTO serverShares VALUES(?,?,?,?,?)",
        (
            username,
            share,
            challenge,
            challenge,
            resHash,
        ),
    )
    con.commit()


def storeClientShares(
    share: str, resource: str, name: str, size: str, un: str, owner: str
) -> None:
    con, dbCursor = getDatabaseCursor()
    dbCursor.execute(
        "INSERT INTO clientShares VALUES(?,?,?,?,?,?)",
        (un, owner, share, resource, name, size),
    )
    con.commit()
