from config import configs
from .sqliteHelper import getDatabaseCursor
import os

destination = configs.STORAGE_DIR
usrDir = configs.USR_DIR


def saveContent(
    fileList, owner: str, manifest: str, challenge: str, solution: str
) -> bool:
    recFile = os.path.join(usrDir, "{}".format(owner))
    with open(recFile, "w") as f:
        f.write(manifest)
    for file in fileList:
        fileDest = os.path.join(destination, file["resource"])
        with open(fileDest, "w") as f:
            f.write(file["file"])
            f.close()
    con, cursor = getDatabaseCursor()
    _ = cursor.execute(
        "INSERT INTO proofs VALUES(?,?,?)", (file["resource"], challenge, solution)
    )
    con.commit()
    return True
