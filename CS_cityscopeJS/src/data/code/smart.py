import pandas as pd
import numpy as np
class Smart:
    def __init__(self):
        def convert_datetime(series):
            return pd.to_datetime(series, format="%Y-%m-%d %H:%M:%S")
        self.energy = pd.read_csv("../EUR/Integrated/energy_usages.csv",  parse_dates=["time"], date_parser=convert_datetime, index_col=0)
        self.solar = pd.read_csv("../EUR/Integrated/solar_energy.csv",  parse_dates=["time"], date_parser=convert_datetime, index_col=0)
        
        self.energy = self.attachPeriod(self.energy)
    
        # d = self.solar.replace(r'^\s*$', np.nan, regex=True)
        # print(d.tail(10))
        self.solar = self.attachPeriod(self.solar)

    def attachPeriod(self, d):
        d = d.copy()
        d["month"] = pd.DatetimeIndex(d.index).month
        d["year"] = pd.DatetimeIndex(d.index).year
        return d

    def monthlySums(self, year, data_type="energy", sum_col="kWh"):
        return_cols = ["month", "building_name"]
        return_cols.append(sum_col)

        if data_type == "solar":
            d = self.solar
        else:
            d = self.energy

        usage = d[d["year"]==year]
        monthly_sums = usage.groupby([pd.Grouper(level='time', freq='M'),'building_name'])[sum_col].sum().reset_index()
        monthly_sums["month"] = pd.DatetimeIndex(monthly_sums["time"]).month
        return monthly_sums[return_cols]        
    
if __name__ == "__main__":
    smart = Smart()
    # print(smart.solar.tail(20))
    # sums = smart.monthlySums(2020, data_type="solar", sum_col="blinduse_produced(kVARh)")
    sums = smart.monthlySums(2020, data_type="solar", sum_col="elec_poduced(kWh)")
    print(sums)
    # print(sums["kWh"].mean())