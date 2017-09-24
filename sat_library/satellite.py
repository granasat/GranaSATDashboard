import trsp

class Satellite:
    def __init__(self, name, group, tle1, tle2, url):
        self.name = name
        self.group = group
        self.tle1 = tle1
        self.tle2 = tle2
        self.url = url

        self.cat = int(tle1[2:7])            #03-07	Satellite Number
        self.trsp = []

    def addTrsp(self, itrsp):
        self.trsp.append(trsp.Trsp(itrsp))

    def __str__(self):
        return "name : %s group: %s tle1: %s tle2: %s cat: %d with %d trsp" % (self.name,self.group, self.tle1, self.tle2, self.cat, len(self.trsp))