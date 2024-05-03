from ..utils import sqliteHelper
from Crypto.Hash import SHA256


def authLogin(un: str, pw: str) -> bool:
    _, authCursor = sqliteHelper.getDatabaseCursor()
    rec = authCursor.execute(
        "SELECT * FROM credentials WHERE username = ?", (un,)
    ).fetchone()
    if not rec:
        return False
    authCursor.close()
    hashObj = SHA256.new("{}{}".format(rec[2], pw).encode())
    digestPass = hashObj.hexdigest()
    if digestPass == rec[1]:
        return True
    return False
