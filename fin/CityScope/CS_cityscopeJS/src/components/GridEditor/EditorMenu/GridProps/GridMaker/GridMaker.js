import React from "react";
import AppsIcon from "@material-ui/icons/Apps";
import Button from "@material-ui/core/Button";
import { gridCreator } from "./gridCreator";
import { listenToGridCreator } from "../../../../../redux/actions";
import { useDispatch } from "react-redux";

export default function GridMaker(props) {
    const dispatch = useDispatch();

    const handleGridCreation = () => {
        let grid = gridCreator(props.gridProps);
        dispatch(listenToGridCreator(grid));
    };

    return (
        <Button
            onClick={() => {
                handleGridCreation();
            }}
            variant="outlined"
            color="default"
            startIcon={<AppsIcon />}
        >
            Create Grid
        </Button>
    );
}
