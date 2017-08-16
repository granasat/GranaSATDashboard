import DATA
import urllib2
import satellite
import json
import os
import sys

def updateSats():
    if len(DATA.files) < 1:
        print('No files to fetch from network')
    else:
        print('Fetching data')

        for file in DATA.files:
            print('Fetching data from ' + file)

            response = urllib2.urlopen(DATA.baseURL + file)

            # open the file for writing
            fh = open(DATA.cacheDir + file, "w")

            # read from request while writing to file
            fh.write(response.read())
            fh.close()

        print("Files downloaded successfully")

def updateTrsp():
    print("Saving trsp file in %s" % (DATA.cacheDir + DATA.trspFile))
    trspFile = open(DATA.cacheDir + DATA.trspFile, 'w')

    print("Downloading tranceivers data from %s" % DATA.satnogsTrspURL)
    response = urllib2.urlopen(DATA.satnogsTrspURL)
    print("Downloaded successfully, writing content")

    trspFile.write(response.read())

    trspFile.close()
    print("Written successfully")

def createModesFile(path):
    print("Saving mode file in %s" % (path + DATA.modesFile))
    modesFile = open(path + DATA.modesFile, 'w')

    print("Downloading modes data from %s" % DATA.satnogsModesURL)
    response = urllib2.urlopen(DATA.satnogsModesURL)
    print("Downloaded successfully, writing content")

    modesFile.write(response.read())

    modesFile.close()
    print("Written successfully")

def createTrspFile(path):
    # First of all load the trsp
    print("Loading trsp")
    trsps = json.load(open(DATA.cacheDir + DATA.trspFile))

    print("Getting category numbers")
    trspcat = set()
    for trsp in trsps:
        trspcat.add(trsp['norad_cat_id'])

    print("Filling satellite data")
    satellites = []
    for file in DATA.files:
        print("Extracting satellites from %s" % file)
        f = open(DATA.cacheDir + file, 'r')

        if DATA.linesneeded == 3:
            numSats = 0
            i = 0
            for line in f:
                if i == 0:  # Name of the sat
                    name = line.rstrip()
                elif i == 1:
                    tle1 = line.rstrip()
                elif i == 2:
                    tle2 = line.rstrip()
                i += 1
                if i == 3:
                    sat = satellite.Satellite(name, file[:-4], tle1, tle2, DATA.baseURL + file)
                    if sat.cat in trspcat:
                        for trsp in trsps:
                            if sat.cat == trsp['norad_cat_id']:
                                sat.addTrsp(trsp)
                    satellites.append(sat)
                    i = 0
                    numSats += 1

        print("Extraction successful, imported %d satellites" % numSats)
        f.close()

    print("Collecting data, total %d satellites" % len(satellites))

    def obj_dict(obj):
        return obj.__dict__

    print("Writing content to %s" % (path + DATA.resultFile))
    with open(path + DATA.resultFile, 'w') as outfile:
        json.dump(satellites, outfile, default=obj_dict)

    print("Data was written successfully")

if len(sys.argv) > 1 and os.path.isdir(sys.argv[1]):
    dir_path = ""

    if sys.argv[1] == ".":
        dir_path = os.path.dirname(os.path.realpath(__file__))
    else:
        dir_path = sys.argv[1]


    if dir_path[-1:] != '/':
        dir_path += '/'

    print("Updating library")
    cachedir = os.path.dirname(DATA.cacheDir)
    if not os.path.exists(cachedir):
        print("Creating %s" % DATA.cacheDir)
        os.makedirs(cachedir)

    updateSats()
    updateTrsp()
    createTrspFile(dir_path)
    createModesFile(dir_path)

else:
    print("Put a directory")


