from brix import Indicator
from statistics import mean
import random
import pandas as pd
class MyIndicator(Indicator):
        '''
        Write a description for your indicator here.
        '''
        def setup(self):
                '''
                Think of this as your __init__.
                Here you will define the properties of your indicator.
                Although there are no required properties, be nice and give your indicator a name.
                '''
                self.name = 'my numeric'
                self.requires_geometry= True
                self.requires_geogrid_props = True
                self.indicator_type = 'numeric'
                self.viz_type = 'radar'
                
        def load_module(self):
                '''
                This function is not strictly necessary, but we recommend that you define it if you want to load something from memory. It will make your code more readable.
                All data loading actions should go here.
                '''
                pass

        def return_indicator(self, geogrid_data):
                '''
                This is the main course of your indicator.
                This function takes in `geogrid_data` and returns the value of your indicator.
                The library is flexible enough to handle indicators that return a number or a dictionary.
                '''
                return 300

class RandomFlag(Indicator):
        '''
        Example of textual indicator that annotates two random cells.
        '''
        def setup(self):
                self.indicator_type = 'textual'
                self.requires_geometry = True
                self.name = 'Yes/No'

        def return_indicator(self, geogrid_data):
                cells = random.sample(geogrid_data,2)
                out = [
                        {'id':cells[0]['id'],'info':'2'},
                        {'id':cells[1]['id'],'info':'1'},
                ]
                return out

class Corona(Indicator):
        '''
        An example Corona indicator which displays heat maps in different locations depending on the amount of offices.

        Note that this class requires the geometry of the table as input, which is why it sets:
        requires_geometry = True
        in the setup.

        '''
        def setup(self):
                self.indicator_type = 'heatmap'
                self.requires_geometry = True
                self.name = "corona"
        def load_module(self):
                self.parks = []

        def return_indicator(self, geogrid_data):
                features = []

                # Count the amount of offices and store their locations
                offices = 0
                office_points = []
                for i, cell in enumerate(geogrid_data):
                        name = cell["name"]
                        if name == "Office":
                                offices += 1
                                lat,lon = zip(*cell['geometry']['coordinates'][0])
                                lat,lon = mean(lat),mean(lon)
                                office_points.append((lat, lon))

                # Load the locations of the parks
                d = pd.read_csv("Parks_cityscope.csv")
                parks = list(zip(d["x"].values.tolist(), d["y"].values.tolist()))

                heat_points = parks
                if offices >= 8:
                        heat_points = office_points
                
                # Set the heat maps to the right locations depending on the amount of offices
                for x, y in heat_points:
                        feature={}
                        feature['geometry'] = {'coordinates': [x,y],'type': 'Point'}
                        feature['properties'] = {self.name: random.randint(0, 20)}
                        #         feature['properties'] = {self.name: test, "whatever": 6}
                        features.append(feature)

                out = {'type':'FeatureCollection','features':features}
                return out

