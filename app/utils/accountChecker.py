from .sqliteHelper import getDatabaseCursor

def userExists(username:str) -> bool:
    _, dbCursor = getDatabaseCursor()
    rec = dbCursor.execute("SELECT * FROM credentials WHERE username=?",(username,)).fetchone()
    if rec == None:
        return False
    return True