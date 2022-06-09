import pandas as pd
class Smart:
    def __init__(self):
        def convert_datetime(series):
            return pd.to_datetime(series, format="%Y-%m-%d %H:%M:%S")
        self.energy = pd.read_csv("EUR/Integrated/energy_usages.csv",  parse_dates=["time"], date_parser=convert_datetime, index_col=0)
        # self.energy["month"] = pd.DatetimeIndex(self.energy.index).month
        # self.energy["year"] = pd.DatetimeIndex(self.energy.index).year


    def monthlySums(self, year):
        year_energy = self.energy[self.energy["year"]==year]
        monthly_sums = year_energy.groupby([pd.Grouper(level='time', freq='M'),'building_name'])["kWh"].sum().reset_index()
        monthly_sums["month"] = pd.DatetimeIndex(monthly_sums["time"]).month
        return monthly_sums[["month", "building_name", "kWh"]]        
    
if __name__ == "__main__":
    smart = Smart()

    # print(smart.monthlySums(2019))