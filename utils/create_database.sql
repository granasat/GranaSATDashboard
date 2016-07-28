CREATE TABLE USERS (
  USR_ID TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  USR_NAME VARCHAR(50) NOT NULL UNIQUE,
  USR_ORGANIZATION VARCHAR(100) NULL,
  USR_MAIL VARCHAR(45) NOT NULL,
  USR_PASSWORD VARCHAR(255) NOT NULL,
  USR_TYPE INTEGER UNSIGNED NOT NULL,
  USR_LAST_VST DATETIME NULL,
  USR_BLOCKED BOOLEAN DEFAULT FALSE,
  PRIMARY KEY(USR_ID)
);

CREATE TABLE ANTENNAS (
  ANT_ID TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ANT_NAME VARCHAR(45) NOT NULL,
  ANT_FREQ VARCHAR(45) NULL,
  ANT_AVAILABLE BOOLEAN,
  PRIMARY KEY(ANT_ID)
);

CREATE TABLE TRANSCEIVERS (
  TRA_ID TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  TRA_NAME VARCHAR(45) NOT NULL,
  TRA_PORT VARCHAR(20) NULL,
  TRA_DEF_PARAMS VARCHAR(255) NULL,
  TRA_AVAILABLE BOOLEAN,
  PRIMARY KEY(TRA_ID)
);

CREATE TABLE ANTENNA_TRANSCEIVER (
  ANT_ID TINYINT UNSIGNED NOT NULL,
  TRA_ID TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY(ANT_ID, TRA_ID),
  FOREIGN KEY(ANT_ID)
    REFERENCES ANTENNAS(ANT_ID)
      ON DELETE CASCADE
      ON UPDATE NO ACTION,
  FOREIGN KEY(TRA_ID)
    REFERENCES TRANSCEIVERS(TRA_ID)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
);

CREATE TABLE MODES (
  MOD_ID TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  TRA_ID TINYINT UNSIGNED NOT NULL,
  MOD_DESC VARCHAR(255) NULL,
  MOD_PARAMS VARCHAR(255) NULL,
  PRIMARY KEY(MOD_ID),
  FOREIGN KEY(TRA_ID)
    REFERENCES TRANSCEIVERS(TRA_ID)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
);

CREATE TABLE REMOTE_TRANSCEIVERS (
  RMT_ID TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  RMT_NAME VARCHAR(45) NOT NULL UNIQUE,
  RMT_DESC VARCHAR(255) NULL,
  RMT_RX_FREQ FLOAT NULL,
  RMT_TX_FREQ FLOAT NULL,
  RMT_STATUS VARCHAR(40) NULL,
  PRIMARY KEY(RMT_ID)
);

CREATE TABLE SATELLITES (
  SAT_ID TINYINT UNSIGNED NOT NULL,
  SAT_TLE VARCHAR(255) NOT NULL,
  SAT_TLE_URL VARCHAR(255) NULL,
  PRIMARY KEY(SAT_ID),
  FOREIGN KEY(SAT_ID)
    REFERENCES REMOTE_TRANSCEIVERS(RMT_ID)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
);

CREATE TABLE STATIONS (
  STA_ID TINYINT UNSIGNED NOT NULL,
  STA_CALLSIGN VARCHAR(10) NOT NULL UNIQUE,
  PRIMARY KEY(STA_ID),
  FOREIGN KEY(STA_ID)
    REFERENCES REMOTE_TRANSCEIVERS(RMT_ID)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
);

CREATE TABLE SONDES (
  SND_ID TINYINT UNSIGNED NOT NULL,
  SND_NAME VARCHAR(10) NOT NULL UNIQUE,
  SND_TYPE VARCHAR(50) NULL,
  PRIMARY KEY(SND_ID),
  FOREIGN KEY(SND_ID)
    REFERENCES REMOTE_TRANSCEIVERS(RMT_ID)
      ON DELETE CASCADE
      ON UPDATE NO ACTION
);

CREATE TABLE RECEPTION_SCHEDULER (
  PAS_DATE DATETIME NOT NULL,
  USR_ID TINYINT UNSIGNED NOT NULL,
  RMT_ID TINYINT UNSIGNED NOT NULL,
  TRA_ID TINYINT UNSIGNED NOT NULL,
  ANT_ID TINYINT UNSIGNED NOT NULL,
  MOD_ID TINYINT UNSIGNED NOT NULL,
  DURATION INT NULL,
  PRIMARY KEY(PAS_DATE, USR_ID, RMT_ID, TRA_ID, ANT_ID, MOD_ID),
  FOREIGN KEY(USR_ID)
    REFERENCES USERS(USR_ID)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION,
  FOREIGN KEY(RMT_ID)
    REFERENCES REMOTE_TRANSCEIVERS(RMT_ID)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION,
  FOREIGN KEY(TRA_ID, ANT_ID)
    REFERENCES ANTENNA_TRANSCEIVER(TRA_ID, ANT_ID)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION,
  FOREIGN KEY(MOD_ID)
    REFERENCES MODES(MOD_ID)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
);

CREATE TABLE MSG_RECEIVED (
  MSG_ID TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  PAS_DATE DATETIME NOT NULL,
  USR_ID TINYINT UNSIGNED NOT NULL,
  RMT_ID TINYINT UNSIGNED NOT NULL,
  TRA_ID TINYINT UNSIGNED NOT NULL,
  ANT_ID TINYINT UNSIGNED NOT NULL,
  MOD_ID TINYINT UNSIGNED NOT NULL,
  MSG_FORMAT VARCHAR(20) NULL,
  MSG_CONTENT VARCHAR(255) NULL,
  MSG_TIME DATETIME NOT NULL,
  PRIMARY KEY(MSG_ID, PAS_DATE, USR_ID, RMT_ID, TRA_ID, ANT_ID, MOD_ID),
  FOREIGN KEY(PAS_DATE, USR_ID, RMT_ID, TRA_ID, ANT_ID, MOD_ID)
    REFERENCES RECEPTION_SCHEDULER(PAS_DATE, USR_ID, RMT_ID, TRA_ID, ANT_ID, MOD_ID)
      ON DELETE NO ACTION
      ON UPDATE NO ACTION
);
