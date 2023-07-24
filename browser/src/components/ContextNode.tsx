

import { Context, duration, getAllChildren } from "../model/Context";
import { CircularProgress, Divider, Grid, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack } from "@mui/material";

import { grey } from '@mui/material/colors';
import { Item } from "./Item";
import { DataRenderer } from "./DataRenderer";

import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ReplayIcon from '@mui/icons-material/Replay';
import ErrorIcon from '@mui/icons-material/Error';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightAltIcon from '@mui/icons-material/ArrowRightAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ForwardIcon from '@mui/icons-material/Forward';
import MenuIcon from '@mui/icons-material/Menu';
import CircleIcon from '@mui/icons-material/Circle';
import InputIcon from '@mui/icons-material/Input';
import OutputIcon from '@mui/icons-material/Output';

import { humanReadableDuration, short_repr } from "../common/utils";
import PopupState, { bindMenu, bindTrigger } from "material-ui-popup-state";
import { Opener, OpenerMode } from "./DataBrowser";
import { TagChip } from "./TagChip";
import React, { ReactNode } from "react";
import { title } from "process";

//const DEFAULT_COLORS = [grey[100], grey[200], grey[300], grey[400], grey[500]];
const DEFAULT_COLORS = [grey[100], grey[300]];


function ContextMenu(props: { context: Context, setOpen: Opener }) {

    return (
        <PopupState variant="popover" popupId="demo-popup-menu">
            {(popupState) => (
                <>
                    <IconButton {...bindTrigger(popupState)}><MenuIcon /></IconButton>

                    <Menu {...bindMenu(popupState)}>

                        <MenuItem onClick={() => { props.setOpen(getAllChildren(props.context), OpenerMode.Open); popupState.close() }}>
                            <ListItemIcon>
                                <ArrowDropDownIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Expand all children</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => { props.setOpen(getAllChildren(props.context), OpenerMode.Close); popupState.close() }}>
                            <ListItemIcon>
                                <ArrowRightIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Collapse all children</ListItemText>
                        </MenuItem>
                    </Menu>
                </>
            )}
        </PopupState>
    );
}

function ContextNodeItem(props: { icon?: React.ReactNode, title?: string, children?: React.ReactNode }) {

    //<div style={{ marginLeft: 10 }}>
    return <Stack direction="row" style={{ marginLeft: 20, marginTop: 5, marginBottom: 5, }}>
        {props.icon}
        <div style={{ marginLeft: 10 }}>{props.children}</div>
    </Stack>
    // {props.icon}
    // {props.children}
    //</div >
}


export function ContextNode(props: { context: Context, depth: number, opened: Set<string>, setOpen: Opener }) {
    let themeWithBoxes = false;

    let c = props.context;
    let open = props.opened.has(c.uid);
    let backgroundColor = c.meta?.color_bg;
    if (!backgroundColor && themeWithBoxes) {
        backgroundColor = DEFAULT_COLORS[props.depth % 2];
    }

    let mainColor = c.meta?.color;

    // // HACK =========
    // if (mainColor === "#ffb27f50") {
    //     mainColor = "red";
    // }

    // if (mainColor === "#ff9a7f50") {
    //     mainColor = "green";
    // }
    // // ===============


    let icon: React.ReactNode;
    let small = false;

    let iconStyle = { paddingRight: 10, color: mainColor };

    if (c.state === "open") {
        icon = <span style={{ paddingRight: 10 }}><CircularProgress size="1em" /></span>
    } else if (c.state === "event") {
        icon = <CircleIcon style={iconStyle} />
    } else if (c.state === "error") {
        icon = <ErrorIcon style={iconStyle} />
    } else if (c.kind === "repeat_on_failure") {
        icon = <ReplayIcon style={iconStyle} />
    } else if (c.kind === "query") {
        icon = <QuestionMarkIcon style={iconStyle} />
    } else if (c.kind === "action") {
        icon = <ForwardIcon style={iconStyle} />
    } else if (c.kind === "observation") {
        icon = <VisibilityIcon style={iconStyle} fontSize="small" />
        small = true;
    } else {
        icon = <AccountTreeIcon style={iconStyle} />
    }

    const borderColor = c.meta?.color_border;


    function body() {
        let inputs;

        if (c.inputs) {
            inputs = [];
            for (const property in c.inputs) {
                const value = c.inputs[property];
                inputs.push({ property, value });
            }
        }

        let borderLeft;
        if (!themeWithBoxes) {
            borderLeft = "2px " + (mainColor || "black") + " solid"
        }

        return <div style={{ borderLeft, textAlign: "left", marginLeft: "16px" }}>
            {inputs &&
                (
                    inputs.map(({ property, value }, i) =>

                        <ContextNodeItem key={i} icon={<InputIcon />}>
                            <div><strong>{property}</strong></div>
                            <DataRenderer uid={c.uid + "/inputs/" + property} data={value} opened={props.opened} setOpen={props.setOpen} />
                        </ContextNodeItem>
                    )

                )
            }
            {
                c.children && (

                    c.children?.filter((ctx) => !ctx.kind || props.opened.has(ctx.kind)).map((ctx) => <div key={ctx.uid} style={{ paddingLeft: 15 }}>
                        <ContextNode context={ctx} depth={props.depth + 1} opened={props.opened} setOpen={props.setOpen} /></div>)

                )
            }
            {
                c.result &&
                <ContextNodeItem icon={<OutputIcon />}>
                    <DataRenderer uid={c.uid + "/result"} data={c.result} opened={props.opened} setOpen={props.setOpen} />
                </ContextNodeItem>
            }
            {
                c.error &&
                <ContextNodeItem icon={<ErrorIcon />}>
                    <DataRenderer uid={c.uid + "/error"} data={c.error} hideType="error" opened={props.opened} setOpen={props.setOpen} />
                </ContextNodeItem>
            }
        </div >
    }

    const header = () => {
        let short_result = undefined; // c.result ? short_repr(c.result) : null;
        const dur = duration(props.context);
        if (dur && dur > 0) {
            <span style={{ color: "gray", marginLeft: 10 }}>{humanReadableDuration(dur)}</span>
        }
        return <div style={{ display: "flex", alignContent: "space-between" }}><div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            width: "100%",
        }}>
            <IconButton size="small" onClick={() => props.setOpen(c.uid, OpenerMode.Toggle)}>{open ? <ArrowDropDownIcon /> : <ArrowRightIcon />}</IconButton>{icon}
            <span style={{ color: mainColor, fontSize: small ? "75%" : undefined }}>{c.name}</span> {short_result && <><ArrowRightAltIcon /> {short_result}</>} {/*c.kind ? " [" + c.kind + "]" : ""*/}
            {dur && dur > 0 ? <span style={{ color: "gray", marginLeft: 10 }}>{humanReadableDuration(dur)}</span> : ""}
            {c.tags?.map((t, i) => <TagChip key={i} tag={t} />)}
        </div>
            <ContextMenu context={c} setOpen={props.setOpen} />
        </div>
    }

    if (themeWithBoxes) {
        return <Item style={{ backgroundColor, paddingTop: small ? 0 : undefined, paddingBottom: small ? 0 : undefined, border: borderColor ? `2px ${borderColor} solid` : undefined }}>
            <>
                {header()}
                {open && body()}
            </>
        </Item >
    } else {
        return <div style={{ backgroundColor, border: borderColor ? `2px ${borderColor} solid` : undefined }}>
            {header()}
            {open && body()}
        </div>
    }
}