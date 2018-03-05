import urllib2
import satellite
import json
import os
import sys

def updateSats():
    if len(DATA["scripts_update_files"]) < 1:
        print('No files to fetch from network')
    else:
        print('Fetching data')

        for file in DATA["scripts_update_files"]:
            print('Fetching data from ' + file)

            response = urllib2.urlopen(DATA["scripts_update_baseurl"] + file)

            # open the file for writing
            fh = open(DATA["scripts_update_cache_dir"] + file, "w")

            # read from request while writing to file
            fh.write(response.read())
            fh.close()

        print("Files downloaded successfully")

def updateTrsp():
    print("Saving trsp file in %s" % (DATA["scripts_update_cache_dir"] + DATA["scripts_update_trsp_file"]))
    trspFile = open(DATA["scripts_update_cache_dir"] + DATA["scripts_update_trsp_file"], 'w')

    print("Downloading tranceivers data from %s" % DATA["scripts_update_satnogs_trsp_url"])
    response = urllib2.urlopen(DATA["scripts_update_satnogs_trsp_url"])
    print("Downloaded successfully, writing content")

    trspFile.write(response.read())

    trspFile.close()
    print("Written successfully")

def createModesFile(path):
    print("Saving mode file in %s" % (path + DATA["scripts_update_modes_file"]))
    modesFile = open(path + DATA["scripts_update_modes_file"], 'w')

    print("Downloading modes data from %s" % DATA["scripts_update_satnogs_modes_url"])
    response = urllib2.urlopen(DATA["scripts_update_satnogs_modes_url"])
    print("Downloaded successfully, writing content")

    modesFile.write(response.read())

    modesFile.close()
    print("Written successfully")

def createTrspFile(path):
    # First of all load the trsp
    print("Loading trsp")
    trsps = json.load(open(DATA["scripts_update_cache_dir"] + DATA["scripts_update_trsp_file"]))

    print("Getting category numbers")
    trspcat = set()
    for trsp in trsps:
        trspcat.add(trsp['norad_cat_id'])

    print("Filling satellite data")
    satellites = []
    numSats = 0
    for file in DATA["scripts_update_files"]:
        print("Extracting satellites from %s" % file)
        f = open(DATA["scripts_update_cache_dir"] + file, 'r')

        if int(DATA["scripts_update_linesneeded"]) == 3:
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
                    sat = satellite.Satellite(name, file[:-4], tle1, tle2, DATA["scripts_update_baseurl"] + file)
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

    print("Writing content to %s" % (path + DATA["scripts_update_result_file"]))
    with open(path + DATA["scripts_update_result_file"], 'w') as outfile:
        json.dump(satellites, outfile, default=obj_dict)

    print("Data was written successfully")


configFile = sys.argv[2] if len(sys.argv) > 2 else 'config.json'

with open(configFile) as data_file:
    DATA = json.load(data_file)

if len(sys.argv) > 1 and os.path.isdir(sys.argv[1]):
    dir_path = ""

    if sys.argv[1] == ".":
        dir_path = os.path.dirname(os.path.realpath(__file__))
    else:
        dir_path = sys.argv[1]


    if dir_path[-1:] != '/':
        dir_path += '/'

    print("Updating library")
    cachedir = os.path.dirname(DATA["scripts_update_cache_dir"])
    if not os.path.exists(cachedir):
        print("Creating %s" % DATA["scripts_update_cache_dir"])
        os.makedirs(cachedir)

    updateSats()
    updateTrsp()
    createTrspFile(dir_path)
    createModesFile(dir_path)

else:
    print("Put a directory")

