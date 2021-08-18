from brix import Handler
from indicators import Noise
if __name__ == '__main__':
    H = Handler('yourtest',quietly=False)
    geogrid_data = H.get_geogrid_data()
    heat = Noise()
    
    H.add_indicators([
            heat
    ])
    print(H.list_indicators())
    print(H.return_indicator("hot"))
    H.listen()