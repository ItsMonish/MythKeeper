from .sqliteHelper import getDatabaseCursor
from config import configs
from os import path,remove

storageDir = configs.STORAGE_DIR
usrDir = configs.USR_DIR

def deletionSeq(resource:str , manifest:str , owner:str):
    targetFile = path.join(storageDir,resource)
    remove(targetFile)
    recFile = path.join(usrDir, "{}".format(owner))
    with open(recFile, 'w') as f:
        f.write(manifest) 
    con, dbCursor = getDatabaseCursor()
    _ = dbCursor.execute("DELETE FROM proofs WHERE resource=?",(resource,))
    con.commit()
