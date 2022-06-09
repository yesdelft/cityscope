import pandas as pd
class Smart:
    def __init__(self):
        self.energy = pd.read_csv("EUR/Integrated/energy_usages.csv", converters= {"time": pd.to_datetime}, index_col=0) 
        self.energy["month"] = pd.DatetimeIndex(self.energy.index).month
        self.energy["year"] = pd.DatetimeIndex(self.energy.index).year


    def monthlySums(self, year):
        year_energy = self.energy[self.energy["year"]==year]
        # monthly_sums = self.energy.groupby(pd.Grouper(level='time', freq='M')).sum()
        # year_energy["result"]
        monthly_sums = year_energy.groupby([pd.Grouper(level='time', freq='M'),'building_name'])["kWh"].sum().reset_index()
        # monthly_sums.set_index("time")
        monthly_sums["month"] = pd.DatetimeIndex(monthly_sums["time"]).month
        return monthly_sums[["month", "building_name", "kWh"]]

        
    
if __name__ == "__main__":
    smart = Smart()

    print(smart.monthlySums(2019))