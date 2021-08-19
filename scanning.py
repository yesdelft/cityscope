from brix import Handler
import time
import json
import os
types = {
    -1:"Invalid", 
    0:"Institutional", 
    1:"Office",  
    2:"Park",  
}


H = Handler('yourtest',quietly=False)
geogrid_data = H.get_geogrid_data()

scanned = [[0, 0], [1, 0], [1, 0], [1, 0], [1, 0], [-1, -1], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0], [1, 0]]

def perform_update():       
        H.update_geogrid_data(update_types)
def update_types(geogrid_data):
        with open('CS_CityScoPy/scanner_data.txt') as json_file:
                data = json.load(json_file)
        scanned = data
       
        print(f"Updating grid to \n{scanned}")
        if not type(scanned[0]) == list:
                return geogrid_data
        # print(geogrid_data)
        for i, cell in enumerate(geogrid_data):
                if i > 3: 
                        continue
                cell['name'] = 'Institutional'
                id = cell["id"]

                if scanned[i][0] not in types:
                        continue
                scanned_type = types[scanned[i][0]]
                if scanned_type != "Invalid":
                        cell['name'] = scanned_type
                # print(f"i:{i}, id:{id}")
        return geogrid_data


def periodic_work(interval):
    while True:
        #change this to the function you want to call, or paste in the code you want to run
        monkey = Monkey()
        monkey.ook()
        # perform_update()
        #interval should be an integer, the number of seconds to wait
        time.sleep(interval) 


class Monkey(object):
    def __init__(self):
        self._cached_stamp = 0
        self.filename = 'CS_CityScoPy/scanner_data.txt'

    def ook(self):
        stamp = os.stat(self.filename).st_mtime
        if stamp != self._cached_stamp:
            self._cached_stamp = stamp
            # File has changed, so do something
            perform_update()
        else:
            print("no update")
if __name__ == '__main__':
    periodic_work(2)