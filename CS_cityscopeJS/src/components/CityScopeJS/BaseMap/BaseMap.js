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
import { StaticMap } from "react-map-gl";
import DeckGL from "@deck.gl/react";
import { TripsLayer , TileLayer } from "@deck.gl/geo-layers";
import {SolidPolygonLayer, BitmapLayer} from '@deck.gl/layers';
import "mapbox-gl/dist/mapbox-gl.css";
import { HeatmapLayer, PathLayer, GeoJsonLayer } from "deck.gl";
import { LightingEffect, AmbientLight, _SunLight } from "@deck.gl/core";
import settings from "../../../settings/settings.json";
// import test_trip_data from "./test_trip_data.json";
import ui_control from "./ui_control.json";
import { _hexToRgb } from "../../GridEditor/EditorMap/EditorMap";
import axios from "axios";
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
            viewState: settings.map.initialViewState,
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
                console.log("receiving UI data:", response.data);
                this.setState({ remoteMenu: response.data.data}) 
               
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
        let cityioURL = "https://reqres.in/api/users/2";
		this.getUIData(cityioURL)
		let interval = 10000
        // and every interval
        this.timer = setInterval(() => {
            if (this._isMounted) {
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
        const header = this.props.cityioData.GEOGRID.properties.header;

        this.setState({
            viewState: {
                ...this.state.viewState,
                longitude: header.longitude,
                latitude: header.latitude,
                zoom: 15,
                pitch: 0,
                bearing: 360 - header.rotation,
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

        if (this.state.animateABM) {
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
        
        console.log("rear rendering");
        console.log("many state:",this.state.remoteMenu);
        let remote = this.state.remoteMenu;
        let controlRemotely = true

        if ((controlRemotely && ui_control.toggles.includes("ABM")) || (!controlRemotely && menu.includes("ABM"))) {
            layers.push(
                new TripsLayer({
                    id: "ABM",
                    visible: menu.includes("ABM") ? true : false,
                    data: cityioData.ABM2.trips,
                    getPath: (d) => d.path,
                    getTimestamps: (d) => d.timestamps,
                    getColor: (d) => {
                        let col = _hexToRgb(
                            cityioData.ABM2.attr[ABMmode][d[ABMmode]].color
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

        if (menu.includes("AGGREGATED_TRIPS")) {
            layers.push(
                new PathLayer({
                    id: "AGGREGATED_TRIPS",
                    visible: menu.includes("AGGREGATED_TRIPS") ? true : false,
                    _shadow: false,
                    data: cityioData.ABM2.trips,
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
                            cityioData.ABM2.attr[ABMmode][d[ABMmode]].color
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

        if (menu.includes("GRID")) {
            layers.push(
                new GeoJsonLayer({
                    id: "GRID",
                    data: this.state.GEOGRID,
                    visible: menu.includes("GRID") ? true : false,
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


        // if (menu.includes("Bounds")) {
            if ((controlRemotely && ui_control.toggles.includes("Bounds")) || (!controlRemotely && menu.includes("Bounds"))) {
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
        if ((controlRemotely && ui_control.toggles.includes("ACCESS")) || (!controlRemotely && menu.includes("ACCESS"))) {
            layers.push(
                new HeatmapLayer({
                    id: "ACCESS",
                    visible: menu.includes("ACCESS"),
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
        if ((controlRemotely && ui_control.toggles.includes("LST")) || (!controlRemotely && menu.includes("LST"))) {
        layers.push(
            new BitmapLayer({
                id: 'bitmap-layer',
                bounds: [4.45313, 51.89948, 4.52568, 51.92680 ],
                image: 'https://raw.githubusercontent.com/pratyush1611/testDatasetCityScope/main/LST_jul_21_rotterdam.png'
                })
            );
        }

        // if (ui_control.LST.enabled) 
        if ((controlRemotely && ui_control.toggles.includes("AQI")) || (!controlRemotely && menu.includes("AQI"))) {
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
