#author: Antonio Serrano (Github:antserran)

import math
import time
import datetime

import numpy as np
import sys
import predict
import json

# Getting arguments
name = sys.argv[1]
l1 = sys.argv[2]
l2 = sys.argv[3]

# Creating TLE from previous parameters
tle = name + "\n" + l1 + "\n" + l2
qth = (37.179640, -3.6095, 673)  # lat (N), long (W), alt (meters)

# Getting data as a dictionary
p = predict.observe(tle, qth)

# Saving data
data = {}
data ["footprint"] = p["footprint"]
data ["latitude"] = p["latitude"]
data ["longitude"] = p["longitude"]
data ["altitude"] = p["altitude"]
data ["light"] = p["sunlit"]
data ["azimuth"] = p["azimuth"]
data ["elevation"] = p["elevation"]

#print (json.dumps(data))

# Saving file
f=open("./sat_library/data2.json","w")
f.write(json.dumps(data))
f.close()
