#author: Antonio Serrano (Github:antserran)


import math
import time
import datetime
import ephem
import numpy as np
import sys
import json

# Getting arguments
name = sys.argv[1]
l1 = sys.argv[2]
l2 = sys.argv[3]

data = {}
data["coordinates"] = []

#--------------------------------------------
# TIME
#--------------------------------------------
N = 500; # N interval times

times = []

# Calculating past
for i in range (1,N):
	date = datetime.datetime.utcnow() - datetime.timedelta(seconds= 15*i) # Calculate every 15s
	times.append(date)


times = times[::-1] # this makes the array be in chronological order

# Caltulating future
for i in range (1,N):
	date = datetime.datetime.utcnow() + datetime.timedelta(seconds= 15*i) # Calculate every 15s
	times.append(date)

#--------------------------------------------
# CALCULATING SATELLITE ORBIT
#--------------------------------------------
sat = ephem.readtle(name, l1, l2)
for date in times:
	sat = ephem.readtle(name, l1, l2)
	sat.compute(date) # calculate
	c = (np.rad2deg(sat.sublat), np.rad2deg(sat.sublong)) # get coordinates
	data["coordinates"].append(c) # save


# Saving now
now = datetime.datetime.utcnow()
sat = ephem.readtle(name, l1, l2)
sat.compute(now) # calculate
data["now"] = (np.rad2deg(sat.sublat), np.rad2deg(sat.sublong))

#print (json.dumps(data))

# Saving file
f=open("./sat_library/data.json","w")
f.write(json.dumps(data))
f.close()