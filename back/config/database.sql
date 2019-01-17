CREATE TABLE USERS (
    "ID" INTEGER PRIMARY KEY AUTOINCREMENT,
    "USERNAME" TEXT,
    "EMAIL" TEXT,
    "PASSWORD" TEXT
);
CREATE TABLE POSTS (
    "ID" INTEGER PRIMARY KEY AUTOINCREMENT,
    "TITLE" TEXT,
    "PRICE" TEXT,
    "CONTENT" TEXT
);

INSERT INTO USERS (USERNAME, PASSWORD, EMAIL)
VALUES ('foo', '19841984', 'foo@bar.baz');
