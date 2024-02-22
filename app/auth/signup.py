from ..utils.sqliteHelper import getDatabaseCursor
from Crypto.Hash import SHA256
from Crypto.Random import get_random_bytes

def createUser(userName,password):
    con, dbCursor = getDatabaseCursor("creds.db")
    rec = dbCursor.execute("SELECT * FROM credentials WHERE username = ?",(userName,)).fetchone()
    if rec != None:
        return {"status":"duplicate"}
    salt = get_random_bytes(4).hex()
    hashObj = SHA256.new("{}{}".format(salt,password).encode())
    digest = hashObj.hexdigest()
    dbCursor.execute("INSERT INTO credentials VALUES(?,?,?,?)",(userName,digest,salt,"user",))
    con.commit()
    return {"status":"ok","redirect":"/{}".format(userName)}

    
