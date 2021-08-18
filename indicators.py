from brix import Indicator
from statistics import mean
import random
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

class Noise(Indicator):
        '''
        Example of Noise heatmap indicator for points centered in each grid cell.

        Note that this class requires the geometry of the table as input, which is why it sets:
        requires_geometry = True
        in the setup.

        '''
        def setup(self):
                self.indicator_type = 'heatmap'
                self.requires_geometry = True
                self.name = "hot"
        def load_module(self):
                pass

        def return_indicator(self, geogrid_data):
                features = []
                
                print(geogrid_data) 
                for i, cell in enumerate(geogrid_data):
                        if i>0:
                                continue

                        feature = {}
                        lat,lon = zip(*cell['geometry']['coordinates'][0])
                        
                        print(lat)
                        lat,lon = mean(lat),mean(lon)
                        lat += 0.001
                        feature['geometry'] = {'coordinates': [lat,lon],'type': 'Point'}
                        # feature['properties'] = {self.name:random()}
                        # feature['properties'] = {self.name: random.randint(0, 20)}
                        feature['properties'] = {self.name: 4, "whatever": 6}
                        features.append(feature)
                out = {'type':'FeatureCollection','features':features}
                return out
