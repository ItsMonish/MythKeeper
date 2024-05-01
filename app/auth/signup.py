from ..utils.sqliteHelper import getDatabaseCursor
from Crypto.Hash import SHA256
from Crypto.Random import get_random_bytes
from re import match
from config import configs
from os.path import join

pattern = r'^[a-z][a-z0-9]*$'

def createUser(userName,password,manifest):
    if not match(pattern,userName):
        return {"status":"invalidUsername"}
    con, dbCursor = getDatabaseCursor()
    rec = dbCursor.execute("SELECT * FROM credentials WHERE username = ?",(userName,)).fetchone()
    if rec != None:
        return {"status":"duplicate"}
    recordFile = join(configs.USR_DIR,"{}".format(userName))
    with open(recordFile,'w') as f:
        f.write(manifest)
    salt = get_random_bytes(4).hex()
    hashObj = SHA256.new("{}{}".format(salt,password).encode())
    digest = hashObj.hexdigest()
    dbCursor.execute("INSERT INTO credentials VALUES(?,?,?,?)",(userName,digest,salt,"user",))
    con.commit()
    return {"status":"ok","redirect":"/{}".format(userName)}

    
