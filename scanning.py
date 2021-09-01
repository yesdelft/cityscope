from brix import Handler
import time
import json
import os
import hashlib

# Predefined mapping of scanned Lego types to building types
types = {
    -1:"Invalid", 
    0:"Institutional", 
    1:"Office",  
    2:"Park",  
}


H = Handler('yourtest',quietly=False)
geogrid_data = H.get_geogrid_data()

def perform_update():       
        H.update_geogrid_data(update_types)
def update_types(geogrid_data):
        scanned = [-1, -1]
        with open('CS_CityScoPy/scanner_data.txt') as json_file:
                scanned = json.load(json_file)
       
        print(f"Updating grid to \n{scanned}")
        
        # Make sure the data is in the right format
        if not type(scanned[0]) == list:
                return geogrid_data

        # Update the table cell types in the server to the scanned types
        for i, cell in enumerate(geogrid_data):
                # To facilitate testing, make sure only the first cell in the table is updated
                if i >= 1: 
                        continue

                if scanned[i][0] not in types:
                        continue

                id = cell["id"]
                scanned_type = types[scanned[i][0]]
                if scanned_type != "Invalid":
                        cell['name'] = scanned_type
                # print(f"i:{i}, id:{id}")
        return geogrid_data


def scan_for_updates(interval):
    oldHash = ""
    while True:
        # Update table whenever scanner_data.txt is modified
        with open('CS_CityScoPy/scanner_data.txt', "rb") as f:
                newHash = hashlib.md5(f.read()).hexdigest()
                if oldHash != newHash:
                        perform_update() 
                        oldHash = newHash
    
        #interval should be an integer, the number of seconds to wait
        time.sleep(interval) 

if __name__ == '__main__':
    scan_for_updates(2)