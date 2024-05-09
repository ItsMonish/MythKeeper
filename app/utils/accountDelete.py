from os import path, remove
from config import configs
from .sqliteHelper import getDatabaseCursor

storageDir = configs.STORAGE_DIR
manifestDir = configs.USR_DIR


def accountDeleteSequence(usr: str, resources: list):
    con, dbCursor = getDatabaseCursor()
    for res in resources:
        dbCursor.execute("DELETE FROM proofs WHERE resource=?", (res,))
        targetRes = path.join(storageDir, res)
        remove(targetRes)
    manifestFile = path.join(manifestDir, "{}".format(usr))
    dbCursor.execute("DELETE FROM credentials WHERE username=?",(usr,))
    con.commit()
    remove(manifestFile)
