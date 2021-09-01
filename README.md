# CityScope
## Backend

### environments

CityScoPy and the rest of the code are run in different environments, so each will require the creation of a separate environment.

#### CityScoPy

* Create environment with Python version 3.9
* Install dependencies as specified in `CityScoPy/requirements.txt`

#### General

Setting up the environments for this project was a nightmare. We created a requirements file, but geopandas and its requirements currently need to be installed separately
for it to work properly. 

* Create environment with Python version 3.9
* run `conda install --channel conda-forge geopandas`
* Install dependencies as specified in `requirements.txt`

### Running everything

* run `CS_CityScoPy/run.py` with CityScoPy environment
* run `scanning.py` with general environment
* run `city.py` with general environment
* navigate to https://cityscope.media.mit.edu/CS_cityscopeJS/?cityscope=yourtest to see results

run.py will run the CS_CityScoPy scanner system. This system will use a connected video capturing device to scan a 4x4 black/white Lego brick configuration for each table cell. 
Depending on the code mapping specified,
it will send an array of tuples containing the scanned types and their rotation to the CityIO server or a local server over UDP. E.g. if you have a 2 x 2 grid, 
[[1, 0], [1, 0], [0, 0], [0, 0]] means that the scanned first row contained cells with a Lego brick configuration corresponding to type 1, while the 2nd row was type 0.

The settings for the scanner can be configured in the `cityscopy.json` file. If the scanner crashes upon initialization, modify `camId` to the appropriate video capturing device.
`tags` contains binary codes which define which Lego brick configuration corresponds to which type.

As the server endpoint which the code was sending the scanned data to did not exist, the code was modified to save the scanned data to `scanner_data.txt`.
`scanning.py` then periodically checks for updates in the file and manually sends the updated cell type data to change the cell types in the server. For testing purposes,
it currently only updates type data for the 1st cell.

`city.py` runs the backend modules as defined in `indicators.py`. Whenever the table is updated (e.g. when a cell type changes), it will recompute indicator data and send it to the
server. Currently, it simply displays `Corona` heat maps on every office if there are more than X amount of offices, otherwise it displays the heat maps on some parks.

### Improvements for the future

Send it to the right endpoint

to do
-how to modify the scanner
-possibly sending type data to the server
-how to set up the urban indicator and mobility scanner and maybe doing gamma
-explaining core compound

## Frontend

### Running everything