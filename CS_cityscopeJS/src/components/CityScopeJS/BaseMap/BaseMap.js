import React, { Component } from "react";
import { CellMeta } from "./CellMeta/CellMeta";
import { PaintBrush } from "./PaintBrush/PaintBrush";
import { connect } from "react-redux";
import { listenToSlidersEvents } from "../../../redux/actions";
import {
    _proccessAccessData,
    _proccessGridData,
    _postMapEditsToCityIO,
    testHex,
    hexToRgb,
} from "./BaseMapUtils";

import "mapbox-gl/dist/mapbox-gl.css";
import { StaticMap } from "react-map-gl";

import DeckGL from "@deck.gl/react";
import { TripsLayer , TileLayer } from "@deck.gl/geo-layers";
import {SolidPolygonLayer, BitmapLayer, GridCellLayer, ScatterplotLayer, TextLayer, IconLayer} from '@deck.gl/layers';
import { HeatmapLayer, PathLayer, GeoJsonLayer } from "deck.gl";
import { LightingEffect, AmbientLight, _SunLight } from "@deck.gl/core";

import { _hexToRgb } from "../../GridEditor/EditorMap/EditorMap";

import axios from "axios";

// data from externally added json files
import ui_control from "./ui_control.json";
import settings from "../../../settings/settings.json";
import grid_200_data from "../../../data/grid200_4326.geojson";
import cityioFakeABMData from "../../../settings/fake_ABM.json"; //fake ABM data
import ship_image from "../../../data/ship.png"; 
import ships from "../../../data/ships.json"; 

class Map extends Component {
    constructor(props) {
        super(props);
        this.state = {
            menu: [],
            cityioData: null,
            selectedType: null,
            draggingWhileEditing: false,
            selectedCellsState: null,
            pickingRadius: 40,
            viewState: settings.map.viewCalibration,
            controlRemotely: true,
            remoteMenu: {toggles: []},
            testData: ships
        };
        this.animationFrame = null;
    }

    componentWillUnmount() {
        if (this.animationFrame) {
            window.cancelAnimationFrame(this.animationFrame);
        }
        this._isMounted = false;
    }

    componentDidMount() {
        // fix deck view rotate
        this._rightClickViewRotate();
        // setup sun effects
        this._setupSunEffects();
        // zoom map on CS table location
        this._setViewStateToTableHeader();
        // start ainmation/sim/roate
        this._animate();

        this._isMounted = true;
        this.handleUIURL()
    }

    /**
     * handels events as they derived from redux props
     */
    componentDidUpdate(prevProps, prevState) {
        this._updateSunDirecation(this.props.sliders.time[1]);

        if (prevProps.menu !== prevState.menu) {
            this.setState({ menu: this.props.menu });
        }

        const { cityioData } = this.props;
        if (prevState.cityioData !== cityioData) {
            // get cityio data from props

            this.setState({
                cityioData: cityioData,
                GEOGRID: _proccessGridData(cityioData),
            });

            // ! workaround for preloading access layer data
            if (cityioData.access) {
                this.setState({ access: _proccessAccessData(cityioData) });
            }
        }

        // toggle REMOTE UI
        if (
            !prevProps.menu.includes("REMOTE") &&
            this.props.menu.includes("REMOTE")
        ) {
            this.setState({ controlRemotely: true });
        } else if (
            prevProps.menu.includes("REMOTE") &&
            !this.props.menu.includes("REMOTE")
        ) {
            this.setState({ controlRemotely: false });
        }
        // toggle ABM animation
        if (
            !prevProps.menu.includes("ABM") &&
            this.props.menu.includes("ABM")
        ) {
            this.setState({ animateABM: true });
        } else if (
            prevProps.menu.includes("ABM") &&
            !this.props.menu.includes("ABM")
        ) {
            this.setState({ animateABM: false });
        }

        // toggle rotate animation
        if (
            !prevProps.menu.includes("ROTATE") &&
            this.props.menu.includes("ROTATE")
        ) {
            this.setState({ animateCamera: true });
        } else if (
            prevProps.menu.includes("ROTATE") &&
            !this.props.menu.includes("ROTATE")
        ) {
            this.setState({ animateCamera: false });
        }
        if (
            !prevProps.menu.includes("SHADOWS") &&
            this.props.menu.includes("SHADOWS")
        ) {
            this._effects[0].shadowColor = [0, 0, 0, 0.5];
        }

        if (
            prevProps.menu.includes("SHADOWS") &&
            !this.props.menu.includes("SHADOWS")
        ) {
            this._effects[0].shadowColor = [0, 0, 0, 0];
        }
        //  toggle edit mode and send to cityio
        if (
            prevProps.menu.includes("EDIT") &&
            !this.props.menu.includes("EDIT")
        ) {
            // take props from grid and send
            let dataProps = [];
            for (let i = 0; i < this.state.GEOGRID.features.length; i++) {
                dataProps[i] = this.state.GEOGRID.features[i].properties;
            }
            _postMapEditsToCityIO(
                dataProps,
                cityioData.tableName,
                "/GEOGRIDDATA"
            );
        }

        // toggle reset view mode
        if (
            !prevProps.menu.includes("RESET_VIEW") &&
            this.props.menu.includes("RESET_VIEW")
        ) {
            this._setViewStateToTableHeader();
        } else if (
            prevProps.menu.includes("RESET_VIEW") &&
            !this.props.menu.includes("RESET_VIEW")
        ) {
            this.setState({
                viewState: {
                    ...this.state.viewState,
                    pitch: 45,
                },
            });
        }
    }

    _onViewStateChange = ({ viewState }) => {
        viewState.orthographic = this.props.menu.includes("RESET_VIEW")
            ? true
            : false;

        this.setState({ viewState });
    };

    
    getUIData = (URL) => {
        axios
            .get(URL)
            .then((response) => {
                // put response to state obj
                // console.log("receiving UI data:", response.data);
                // let payload = ui_control;
                let payload = response.data;
                let previousMenu = this.state.remoteMenu;
                if (
                    !previousMenu.toggles.includes("ABM") && 
                    payload.toggles.includes("ABM")
                ) {
                    this.setState({ remoteAnimateABM: true });
                    // console.log("setting remote anime true");
                } else if (
                    previousMenu.toggles.includes("ABM") && 
                    !payload.toggles.includes("ABM")
                ) {
                    this.setState({ remoteAnimateABM: false });
                    // console.log("setting remote anime false");
                }
                this.setState({ remoteMenu: payload}); 
            })

            .catch((error) => {
                if (error.response) {
                    console.log(
                        "error.response:",
                        "\n",
                        error.response.data,
                        "\n",
                        error.response.status,
                        "\n",
                        error.response.headers
                    );
                } else if (error.request) {
                    console.log("error.request:", error.request);
                } else {
                    console.log("misc error:", error.message);
                }
                console.log("request config:", error.config);
            });
    };
	
    handleUIURL = () => {
        // let cityioURL = "https://cityio.media.mit.edu/api/table/yourtest/access";
        // let cityioURL = "https://reqres.in/api/users/2";
        let cityioURL = "https://cs-menu-default-rtdb.europe-west1.firebasedatabase.app/menuItems.json";
		this.getUIData(cityioURL)
		let interval = 2000
        // and every interval
        this.timer = setInterval(() => {
            if (this._isMounted && this.state.controlRemotely) {
                this.getUIData(cityioURL)
            }
        }, interval);
        console.log(
            "starting UI GET interval every " +
                interval +
                "ms "
        );
    };


    /**
     * resets the camera viewport
     * to cityIO header data
     * https://github.com/uber/deck.gl/blob/master/test/apps/viewport-transitions-flyTo/src/app.js
     */
    _setViewStateToTableHeader() {
        // const header = this.props.cityioData.GEOGRID.properties.header;

        this.setState({
            viewState: {
                ...this.state.viewState,
                longitude: settings.map.viewCalibration.longitude,
                latitude: settings.map.viewCalibration.latitude,
                // longitude: header.longitude,
                // latitude: header.latitude,
                zoom: settings.map.viewCalibration.zoom,
                pitch: settings.map.viewCalibration.pitch,
                bearing: settings.map.viewCalibration.rotate,//360 - 0,// header.rotation,
                orthographic: true,
            },
        });
    }

    _setupSunEffects() {
        const ambientLight = new AmbientLight({
            color: [255, 255, 255],
            intensity: 0.85,
        });
        let dirLightSettings = {
            timestamp: 1554927200000,
            color: [255, 255, 255],
            intensity: 1.0,
            _shadow: true,
        };
        const dirLight = new _SunLight(dirLightSettings);
        const lightingEffect = new LightingEffect({ ambientLight, dirLight });
        lightingEffect.shadowColor = [0, 0, 0, 0.5];
        this._effects = [lightingEffect];
    }

    _updateSunDirecation = (time) => {
        var currentDateMidnight = new Date();
        currentDateMidnight.setHours(0, 0, 0, 0);
        var date = new Date(currentDateMidnight.getTime() + time * 1000);
        this._effects[0].directionalLights[0].timestamp = Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDay(),
            date.getHours(),
            date.getMinutes(),
            date.getSeconds()
        );
    };

    _animate() {
        if (this.state.animateCamera) {
            let bearing = this.state.viewState.bearing
                ? this.state.viewState.bearing
                : 0;
            bearing < 360 ? (bearing += 0.05) : (bearing = 0);
            this.setState({
                viewState: {
                    ...this.state.viewState,
                    bearing: bearing,
                },
            });
        }

        let date = new Date();
        let elapsedSeconds = date.getSeconds();
        // console.log(elapsedSeconds)
        // console.log(step)
        let items = [...this.state.testData];
        for (var i=0; i<items.length; i++) {
            if (i>0) {continue;            }
            let newLatitude = items[i].coordinates[0] + (Math.random() - 0.5) / 10000;
            let newLongitude = items[i].coordinates[1] +  (Math.random() - 0.5) / 10000;
            let step = elapsedSeconds % items[i].route.length;
            
            let latitude = items[i].route[step][0];
            let longitude = items[i].route[step][1];
            
            newLatitude = items[i].route[step][0] * Math.PI / 180;
            newLongitude = items[i].route[step][1] * Math.PI / 180;
            let previousStep = 0;
            if (step > 0) {
                previousStep = step - 1
            }
            let previousLat = items[i].route[previousStep][0] * Math.PI / 180;
            let previousLon = items[i].route[previousStep][1] * Math.PI / 180;
            
            let deltaLon = newLongitude - previousLon;
            
            let x = Math.cos(newLatitude) * Math.sin(deltaLon);
            let y = Math.cos(previousLat) * Math.sin(newLatitude) - Math.sin(previousLat) * Math.cos(newLatitude) * Math.cos(deltaLon);
            let newHeading = Math.atan2(x, y) * (180 / Math.PI);
console.log(newHeading);

            let item = {
                ...items[i],
                coordinates: [latitude, longitude],
                heading: newHeading
            }
            items[i] = item
        }
        this.setState({testData: items})

        // if (this.state.animateABM) {
        let controlRemotely = this.state.controlRemotely
        let remote = this.state.remoteMenu;

        if ((controlRemotely && this.state.remoteAnimateABM) || (!controlRemotely && this.state.animateABM)) {
            const time = this.props.sliders.time[1];
            const speed = this.props.sliders.speed;
            const startHour = this.props.sliders.time[0];
            const endHour = this.props.sliders.time[2];
            let t = parseInt(time) + parseInt(speed);
            if (time < startHour || time > endHour) {
                t = startHour;
            }

            this.props.listenToSlidersEvents({
                ...this.props.sliders,
                time: [
                    this.props.sliders.time[0],
                    t,
                    this.props.sliders.time[2],
                ],
            });

            // upddate sun position
            this._updateSunDirecation(t);
        }
        // ! start the req animation frame
        this.animationFrame = window.requestAnimationFrame(
            this._animate.bind(this)
        );
    }

    /**
     * Description. fix deck issue
     * with rotate right botton
     */
    _rightClickViewRotate() {
        document
            .getElementById("deckgl-wrapper")
            .addEventListener("contextmenu", (evt) => evt.preventDefault());
    }

    /**
     * Description. uses deck api to
     * collect objects in a region
     * @argument{object} e  picking event
     */
    _mulipleObjPicked = (e) => {
        const dim = this.state.pickingRadius;
        const x = e.x - dim / 2;
        const y = e.y - dim / 2;
        let mulipleObj = this.deckGL.pickObjects({
            x: x,
            y: y,
            width: dim,
            height: dim,
        });
        return mulipleObj;
    };

    /**
     * Description. allow only to pick cells that are
     *  not of CityScope TUI & that are interactable
     * so to not overlap TUI activity
     */
    _handleGridcellEditing = (e) => {
        const { selectedType } = this.props;
        const { height, color, name } = selectedType;
        const multiSelectedObj = this._mulipleObjPicked(e);
        multiSelectedObj.forEach((selected) => {
            const thisCellProps = selected.object.properties;
            if (thisCellProps && thisCellProps.interactive) {
                thisCellProps.color = testHex(color) ? hexToRgb(color) : color;
                thisCellProps.height = height;
                thisCellProps.name = name;
            }
        });
        this.setState({
            selectedCellsState: multiSelectedObj,
        });
    };

    /**
     * Description.
     * draw target area around mouse
     */
    _renderPaintBrush = () => {
        if (this.props.menu.includes("EDIT")) {
            return (
                this.props.selectedType && (
                    <PaintBrush
                        mousePos={this.state.mousePos}
                        selectedType={this.props.selectedType}
                        divSize={this.state.pickingRadius}
                        mouseDown={this.state.mouseDown}
                        hoveredCells={this.state.hoveredObj}
                    />
                )
            );
        } else {
            return (
                this.state.hoveredObj && (
                    <CellMeta
                        mousePos={this.state.mousePos}
                        hoveredObj={this.state.hoveredObj}
                    />
                )
            );
        }
    };

    _handleKeyUp = () => {
        this.setState({ keyDownState: null });
    };

    _handleKeyDown = (e) => {
        this.setState({ keyDownState: e.nativeEvent.key });
    };

    /**
     * remap line width
     */
    _remapValues = (value) => {
        let remap =
            value > 15 && value < 25 ? 3 : value < 15 && value > 10 ? 12 : 30;
        return remap;
    };

    /**
     * renders deck gl layers
     */
    _renderLayers() {
        const zoomLevel = this.state.viewState.zoom;
        const { cityioData, selectedType, menu, ABMmode } = this.props;

        let layers = [];
        
        // console.log("rear rendering");
        // console.log("remote state:",this.state.remoteMenu);
        let remote = this.state.remoteMenu;
        let controlRemotely = this.state.controlRemotely

        if ((controlRemotely && remote.toggles.includes("ABM")) || (!controlRemotely && menu.includes("ABM"))) {
            layers.push(
                new TripsLayer({
                    id: "ABM",
                    // visible: menu.includes("ABM") ? true : false,
                    visible: (controlRemotely && remote.toggles.includes("ABM")) || (!controlRemotely && menu.includes("ABM")) ? true : false,
                    data: cityioFakeABMData.trips,
                    getPath: (d) => d.path,
                    getTimestamps: (d) => d.timestamps,
                    getColor: (d) => {
                        let col = _hexToRgb(
                            cityioFakeABMData.attr[ABMmode][d[ABMmode]].color
                        );
                        return col;
                    },

                    getWidth: 2,
                    widthScale: this._remapValues(zoomLevel),
                    opacity: 0.8,
                    rounded: true,
                    trailLength: 500 ,
                    currentTime: this.props.sliders.time[1],

                    updateTriggers: {
                        getColor: ABMmode,
                    },
                    transitions: {
                        getColor: 500,
                    },
                })
            );
        }

        // if (menu.includes("AGGREGATED_TRIPS")) {
        if ((controlRemotely && remote.toggles.includes("AGGREGATED TRIPS")) || (!controlRemotely && menu.includes("AGGREGATED_TRIPS"))) {
            layers.push(
                new PathLayer({
                    id: "AGGREGATED_TRIPS",
                    // visible: menu.includes("AGGREGATED_TRIPS") ? true : false,
                    visible: (controlRemotely && remote.toggles.includes("AGGREGATED TRIPS")) || (!controlRemotely && menu.includes("AGGREGATED_TRIPS")) ? true : false,
                    _shadow: false,
                    data: cityioFakeABMData.trips,
                    getPath: (d) => {
                        const noisePath =
                            Math.random() < 0.5
                                ? Math.random() * 0.00005
                                : Math.random() * -0.00005;
                        for (let i in d.path) {
                            d.path[i][0] = d.path[i][0] + noisePath;
                            d.path[i][1] = d.path[i][1] + noisePath;
                            d.path[i][2] = d.mode[0] * 2;
                        }
                        return d.path;
                    },
                    getColor: (d) => {
                        let col = _hexToRgb(
                            cityioFakeABMData.attr[ABMmode][d[ABMmode]].color
                        );
                        return col;
                    },
                    opacity: 0.2,
                    getWidth: 1.5,

                    updateTriggers: {
                        getColor: ABMmode,
                    },
                    transitions: {
                        getColor: 500,
                    },
                })
            );
        }

        // if (menu.includes("GRID")) {
        if ((controlRemotely && remote.toggles.includes("GRID")) || (!controlRemotely && menu.includes("GRID"))) {
            layers.push(
                new GeoJsonLayer({
                    id: "GRID",
                    data: this.state.GEOGRID,
                    visible: (controlRemotely && remote.toggles.includes("GRID")) || (!controlRemotely && menu.includes("GRID")) ? true : false,
                    pickable: true,
                    extruded: true,
                    wireframe: true,
                    lineWidthScale: 1,
                    lineWidthMinPixels: 2,
                    getElevation: (d) => d.properties.height,
                    getFillColor: (d) => d.properties.color,

                    onClick: (event) => {
                        if (
                            selectedType &&
                            menu.includes("EDIT") &&
                            this.state.keyDownState !== "Shift"
                        )
                            this._handleGridcellEditing(event);
                    },

                    onDrag: (event) => {
                        if (
                            selectedType &&
                            menu.includes("EDIT") &&
                            this.state.keyDownState !== "Shift"
                        )
                            this._handleGridcellEditing(event);
                    },

                    onDragStart: () => {
                        if (
                            selectedType &&
                            menu.includes("EDIT") &&
                            this.state.keyDownState !== "Shift"
                        ) {
                            this.setState({ draggingWhileEditing: true });
                        }
                    },

                    onHover: (e) => {
                        if (e.object) {
                            this.setState({ hoveredObj: e });
                        }
                    },

                    onDragEnd: () => {
                        this.setState({ draggingWhileEditing: false });
                    },
                    updateTriggers: {
                        getFillColor: this.state.selectedCellsState,
                        getElevation: this.state.selectedCellsState,
                    },
                    transitions: {
                        getFillColor: 500,
                        getElevation: 500,
                    },
                })
            );
        }


        layers.push(new ScatterplotLayer({
            id: 'scatterplot-layer',
            data: this.state.testData,
            pickable: true,
            opacity: 0.8,
            stroked: true,
            filled: true,
            radiusScale: 6,
            radiusMinPixels: 1,
            radiusMaxPixels: 100,
            lineWidthMinPixels: 1,
            getPosition: d => d.coordinates,
            getRadius: d => d.size,
            getFillColor: d => [255, 140, 0],
            getLineColor: d => [0, 0, 0]
            // transitions: {
            //     getPosition: 0,
            // }
        }));

        layers.push(new TextLayer({
            id: 'text-layer',
            data: this.state.testData,
            pickable: true,
            getPosition: d => d.coordinates,
            getText: d => d.name,
            getSize: d => d.size * 5,
            getPixelOffset: [5, 5],
            getColor: [255, 255, 255],
            getBorderColor: [0, 0, 0],
            getBorderWidth: 3,
            outlineWidth: 10,
            // outlineColor: [0, 0, 0],
            background: true,
            getAngle: d => d.heading,
            getTextAnchor: 'start',
            getAlignmentBaseline: 'top',
            transitions: {
                getPosition: {
                    duration: 1000
                }
            }
          }));

          layers.push(new IconLayer({
            id: 'icon-layer',
            data: this.state.testData,
            pickable: true,
            // iconAtlas and iconMapping are required
            // getIcon: return a string
            // iconAtlas: 'https://www.kindpng.com/picc/m/774-7748130_cargo-ship-icon-png-cargo-ship-icon-transparent.png',
            // iconAtlas: 'https://toppng.com/uploads/preview/home-home-sea-container-ship-icon-11563195830cq8dtw2n3l.png',
            // iconAtlas: '',
            iconAtlas: ship_image,
            // iconAtlas: './././data/cargo-ship.png',
            // iconAtlas: 'https://www.mcicon.com/wp-content/uploads/2021/01/Transport_Ship_1-copy-11.jpg',
            // iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
            iconMapping:  {ship: {x: 0, y: 100, width: 980, height: 608, mask: false}},
            // iconMapping:  {ship: {x: 0, y: 0, width: 128, height: 128, mask: false}},
            getIcon: d => 'ship',
            getAngle: d => d.heading,
            sizeScale: 10,
            getPosition: d => d.coordinates,
            getSize: d => d.size,
            // getColor: d => [Math.sqrt(d.exits), 140, 0]
            transitions: {
                getPosition: {
                    duration: 1000
                }
            }
          }));
        // if (menu.includes("Bounds")) {
            if ((controlRemotely && remote.toggles.includes("Bounds")) || (!controlRemotely && menu.includes("Bounds"))) {
                layers.push(
                    new SolidPolygonLayer({
                        // data: "E:/TU_Delft/job_hunt/YES_Delft/CityScope/datasets/layers/shp/cityScope_rotterdam_aoi_4326.geojson" ,
                        data:[{polygon: [ [ 4.45366, 51.8998 ], [ 4.45366, 51.926761111111119 ], [ 4.5251, 51.926761111111119 ], [ 4.5251, 51.8998 ], [ 4.45366, 51.8998 ] ] } ],
                        getPolygon: d => d.polygon,
                        wireframe:true,
                        getFillColor: [0, 105, 18, 0.88*255],
                        getLineColor: [0,0,0],
                        extruded: false
                    })
            );
        }

        // if (menu.includes("ACCESS")) {
        let accessToggle = (controlRemotely && remote.toggles.includes("ACCESS")) || (!controlRemotely && menu.includes("ACCESS"))
        if (accessToggle) {
            layers.push(
                new HeatmapLayer({
                    id: "ACCESS",
                    // visible: menu.includes("ACCESS"),
                    visible: accessToggle,
                    colorRange: settings.map.layers.heatmap.colors,
                    radiusPixels: 200,
                    opacity: 0.25,
                    data: this.state.access,
                    getPosition: (d) => d.coordinates,
                    getWeight: (d) => d.values[this.props.accessToggle] ,
                    updateTriggers: {
                        getWeight: [this.props.accessToggle],
                    },
                })
                
                
            
            );
        }

        // if (menu.includes("LST")) 
        // {
        let LSTAccessToggle = (controlRemotely && remote.toggles.includes("LST")) || (!controlRemotely && menu.includes("LST"))
        if (LSTAccessToggle)
        {
        layers.push(
            new BitmapLayer({
                id: 'bitmap-layer',
                bounds: [4.45313, 51.89948, 4.52568, 51.92680 ],
                image: 'https://raw.githubusercontent.com/pratyush1611/testDatasetCityScope/main/LST_jul_21_rotterdam.png'
                })
            );
        }

        // if (ui_control.LST.enabled) 
        let AQIAccessToggle = (controlRemotely && remote.toggles.includes("AQI")) || (!controlRemotely && menu.includes("AQI"))
        if (!LSTAccessToggle && AQIAccessToggle) {
        // if (menu.includes("AQI")) 
        // {      
        // console.log("hi I am in here");
        layers.push(
                    // new TileLayer(
                    //         {
                    //         // https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Tile_servers
                    //         // data: 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    //         data:'https://tiles.aqicn.org/tiles/usepa-aqi/{z}/{x}/{y}.png?token=3454bbc02f7eebeb38b79939a23b4bcef9268b48',
                    //         // 'https://tiles.breezometer.com/v1/air-quality/pm25/current-conditions/{z}/{x}/{y}.png?key=5b35d0877bd4470a8bc2621b9f05242e',
                    //         minZoom: 0,
                    //         maxZoom: 22,
                    //         tileSize: 256,
                        
                    //         renderSubLayers: props => 
                    //         {
                    //             const {
                    //                     bbox: {west, south, east, north}
                    //                    } = props.tile;
                            
                    //             return new BitmapLayer(props, {
                    //                                             data: null,
                    //                                             image: props.data,
                    //                                             bounds: [west, south, east, north]
                    //                                            });
                    //         }
                    //       }
                    // )
                    new BitmapLayer({
                        id: 'bitmap-layer',
                        bounds: [4.45313, 51.89948, 4.52568, 51.92680 ],
                        image: 'https://raw.githubusercontent.com/pratyush1611/testDatasetCityScope/main/Air_quality_27_aug_21.png'
                        })
                    ); 
                    
        }

        if ((controlRemotely && remote.toggles.includes("calibrationGridLayer")) || (!controlRemotely && menu.includes("calibrationGridLayer")) ) 
        {   
            // var initLat= settings.map.viewCalibration.latitude;
            // var initLon= settings.map.viewCalibration.longitude;
            // var gridCoord={};
            // var cellSize= 200;
            // var tempLat, tempLon;
            // for(int i=initLat, )
            // {

            // }
                
            console.log("inside calibGridLayer")
            layers.push(

                // new GridCellLayer({
                // /**
                //  * Data format:
                //  * [
                //  *   {centroid: [-122.4, 37.7], value: 100},
                //  *   ...
                //  * ]
                //  */
                //     id: 'grid-cell-layer',
                //     data: grid_200_data,
                //     pickable: true,
                //     extruded: false,
                //     cellSize: 200,
                //     elevationScale: 1,
                //     getPosition: [4.45313, 51.89948],//d => d.geometry.coordinates,
                //     getFillColor: [48, 128, 255, 255]
                //     // getElevation: d => d.value
                // })

                // attempt with  GeoJSON layer
                new GeoJsonLayer({
                    id: 'geojson-layer',
                    data: grid_200_data,
                    pickable: false,
                    stroked: false,
                    filled: false,
                    extruded: false,
                    wireframe:true,
                    pointType: 'circle',
                    lineWidthScale: 1,
                    lineWidthMinPixels: 2,
                    getFillColor: [160, 160, 180, 200],
                    // getLineColor: d => colorToRGBArray(d.properties.color),
                    getPointRadius: 10,
                    getLineWidth: 5,
                    getElevation: 10
                  })

                // // attempt with  screengrid layer
                // new ScreenGridLayer(
                //     {
                //     id: 'screen-grid-layer',
                //     data,
                //     pickable: false,
                //     opacity: 0.8,
                //     cellSizePixels: 200,
                //     colorRange: [
                //         [0, 25, 0, 25],
                //         [0, 85, 0, 85],
                //         [0, 127, 0, 127],
                //         [0, 170, 0, 170],
                //         [0, 190, 0, 190],
                //         [0, 255, 0, 255]
                //         ],
                //     getPosition: d => d.COORDINATES,
                //     getWeight: d => d.SPACES
                //     })
             );
        }   



        // if (menu.includes("REMOTE")) {
        //     this.setState({
        //         controlRemotely: true,
        //     })
        // }
        // console.log("menu//:", this.props);
        return layers;
    }

    render() {
        return (
            <div
                className="baseMap"
                onKeyDown={this._handleKeyDown}
                onKeyUp={this._handleKeyUp}
                onMouseMove={(e) =>
                    this.setState({
                        mousePos: e.nativeEvent,
                    })
                }
                onMouseUp={() =>
                    this.setState({
                        mouseDown: false,
                    })
                }
                onMouseDown={() =>
                    this.setState({
                        mouseDown: true,
                    })
                }
            >
                <React.Fragment>{this._renderPaintBrush()}</React.Fragment>

                <DeckGL
                    ref={(ref) => {
                        // save a reference to the Deck instance
                        this.deckGL = ref && ref.deck;
                    }}
                    viewState={this.state.viewState}
                    onViewStateChange={this._onViewStateChange}
                    layers={this._renderLayers()}
                    effects={this._effects}
                    getTooltip={this.getTooltip}
                    controller={{
                        touchZoom: true,
                        touchRotate: true,
                        dragPan: !this.state.draggingWhileEditing,
                        dragRotate: !this.state.draggingWhileEditing,
                        keyboard: false,
                    }}
                >
                    <StaticMap
                        asyncRender={false}
                        dragRotate={true}
                        reuseMaps={true}
                        mapboxApiAccessToken={
                            process.env.REACT_APP_MAPBOX_TOKEN
                        }
                        mapStyle={settings.map.mapStyle.blue}
                        preventStyleDiffing={true}
                    />
                </DeckGL>
            </div>
        );
    }
}

const mapStateToProps = (state) => {
    return {
        cityioData: state.CITYIO,
        sliders: state.SLIDERS,
        menu: state.MENU,
        accessToggle: state.ACCESS_TOGGLE,
        selectedType: state.SELECTED_TYPE,
        ABMmode: state.ABM_MODE,
    };
};

const mapDispatchToProps = {
    listenToSlidersEvents: listenToSlidersEvents,
};

export default connect(mapStateToProps, mapDispatchToProps)(Map);
