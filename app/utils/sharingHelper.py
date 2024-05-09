from .sqliteHelper import getDatabaseCursor

def getUserSharing(username: str) -> list:
    shareList = []
    _, dbCursor = getDatabaseCursor()
    records = dbCursor.execute("SELECT * FROM clientShares WHERE username=?",(username,)).fetchall()
    if len(records) == 0:
        return shareList
    for rec in records:
        shareList.append({
            "owner": rec[1],
            "resource": rec[3],
            "share": rec[2],
            "name": rec[4],
            "size": rec[5],
        });
    return shareList

def loseSharing(resHash: str, username: str, share: str) -> None:
    con, dbCursor = getDatabaseCursor()
    dbCursor.execute("DELETE FROM clientShares WHERE username=? AND share=?",(username,share,))
    dbCursor.execute("DELETE FROM serverShares WHERE username=? AND reshash=?",(username,resHash))
    con.commit()

def revokeSharing(resource: str, username: str, resHash) -> None:
    con, dbCursor = getDatabaseCursor()
    dbCursor.execute("DELETE FROM clientShares WHERE username=? AND resource=?",(username,resource,))
    dbCursor.execute("DELETE FROM serverShares WHERE username=? AND reshash=?",(username,resHash))
    con.commit()