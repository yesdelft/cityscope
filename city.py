from brix import Handler
from indicators import Corona

if __name__ == '__main__':
    # Create a handler for our table 
    H = Handler('yourtest',quietly=False)
    #     geogrid_data = H.get_geogrid_data()
    
    # Create a new instance of the Corona indicator
    heat = Corona()

    # Add the desired indicators to the table
    H.add_indicators([
            heat
    ])

    print(H.list_indicators())
    print(H.return_indicator("corona"))

    # Listen for updates to the table to recompute indicator data
    H.listen()