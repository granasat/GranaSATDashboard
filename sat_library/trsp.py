class Trsp:
    def __init__(self, baud, mode, uplink_low, downlink_low
                 , alive, cat_id, invert, uplink_high, downlink_high,
                 desc):
        self.baud = baud
        self.mode = mode
        self.uplink_low = uplink_low
        self.downlink_low = downlink_low
        self.alive = alive
        self.cat_id = cat_id
        self.invert = invert
        self.uplink_high = uplink_high
        self.downlink_high = downlink_high
        self.desc = desc

    def __init__(self, itrsp):
        self.baud = itrsp['baud']
        self.mode = itrsp['mode_id']
        self.uplink_low = itrsp['uplink_low']
        self.downlink_low = itrsp['downlink_low']
        self.alive = itrsp['alive']
        self.cat_id = itrsp['norad_cat_id']
        self.invert = itrsp['invert']
        self.uplink_high = itrsp['uplink_high']
        self.downlink_high = itrsp['downlink_high']
        self.desc = itrsp['description']

    def __repr__(self):
        return str(self.__dict__)
