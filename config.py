from os import urandom

class configs:
    SECRET_KEY = urandom(16)
    DB_DIR = "databases/"