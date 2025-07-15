import { useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import rough from "roughjs";
import boardContext from "../../store/board-context";
import { TOOL_ACTION_TYPES, TOOL_ITEMS } from "../../constants";
import toolboxContext from "../../store/toolbox-context";
import socket from "../../utils/socket";

import classes from "./index.module.css";

import {
  getSvgPathFromStroke,
} from "../../utils/element";
import getStroke from "perfect-freehand";
import axios from "axios";


function Board({ id }) {
  const canvasRef = useRef();
  const textAreaRef = useRef();
  console.log(id)

  const {
    elements,
    toolActionType,
    boardMouseDownHandler,
    boardMouseMoveHandler,
    boardMouseUpHandler,
    textAreaBlurHandler,
    undo,
    redo,
    setCanvasId,
    setElements,
    setHistory
  } = useContext(boardContext);
  const { toolboxState } = useContext(toolboxContext);

  const token = localStorage.getItem("whiteboard_user_token");

  const [isAuthorized, setIsAuthorized] = useState(true);

  useEffect(() => {
    if (id) {
      // Join the canvas room (no need for userId)
      socket.emit("joinCanvas", { canvasId: id });

      // Listen for updates from other users
      socket.on("receiveDrawingUpdate", (updatedElements) => {
        setElements(updatedElements);
      });

      // Load initial canvas data
      socket.on("loadCanvas", (initialElements) => {
        setElements(initialElements);
      });

      socket.on("unauthorized", (data) => {
        console.log(data.message);
        alert("Access Denied: You cannot edit this canvas.");
        setIsAuthorized(false);
      });

      return () => {
        socket.off("receiveDrawingUpdate");
        socket.off("loadCanvas");
        socket.off("unauthorized");
      };
    }
  }, [id]);

  useEffect(() => {
    const fetchCanvasData = async () => {
      if (id && token) {
        try {
          const response = await axios.get(`https://api-whiteboard-az.onrender.com/api/canvas/load/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setCanvasId(id); // Set the current canvas ID
          setElements(response.data.elements); // Set the fetched elements
          setHistory(response.data.elements); // Set the fetched elements
        } catch (error) {
          console.error("Error loading canvas:", error);
        } finally {
        }
      }
    };

    fetchCanvasData();
  }, [id, token]);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.ctrlKey && event.key === "z") {
        undo();
      } else if (event.ctrlKey && event.key === "y") {
        redo();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [undo, redo]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.save();

    const roughCanvas = rough.canvas(canvas);

    elements.forEach((element) => {
      switch (element.type) {
        case TOOL_ITEMS.LINE:
        case TOOL_ITEMS.RECTANGLE:
        case TOOL_ITEMS.CIRCLE:
        case TOOL_ITEMS.ARROW:
          roughCanvas.draw(element.roughEle);
          break;
        case TOOL_ITEMS.BRUSH:
          context.fillStyle = element.stroke;
          const path = new Path2D(getSvgPathFromStroke(getStroke(element.points)));
          context.fill(path);
          context.restore();
          break;
        case TOOL_ITEMS.TEXT:
          context.textBaseline = "top";
          context.font = `${element.size}px Caveat`;
          context.fillStyle = element.stroke;
          context.fillText(element.text, element.x1, element.y1);
          context.restore();
          break;
        default:
          throw new Error("Type not recognized");
      }
    });

    return () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [elements]);


  useEffect(() => {
    const textarea = textAreaRef.current;
    if (toolActionType === TOOL_ACTION_TYPES.WRITING) {
      setTimeout(() => {
        textarea.focus();
      }, 0);
    }
  }, [toolActionType]);

  // console.log("Elements ",elements);

  const handleMouseDown = (event) => {
    if (!isAuthorized) return;
    boardMouseDownHandler(event, toolboxState);
  };

  const handleMouseMove = (event) => {
    if (!isAuthorized) return;
    boardMouseMoveHandler(event);
    socket.emit("drawingUpdate", { canvasId: id, elements });
  };

  const handleMouseUp = () => {
    if (!isAuthorized) return;
    boardMouseUpHandler();
    socket.emit("drawingUpdate", { canvasId: id, elements });
  };

  return (
    <>
      {toolActionType === TOOL_ACTION_TYPES.WRITING && (
        <textarea
          type="text"
          ref={textAreaRef}
          className={classes.textElementBox}
          style={{
            top: elements[elements.length - 1].y1,
            left: elements[elements.length - 1].x1,
            fontSize: `${elements[elements.length - 1]?.size}px`,
            color: elements[elements.length - 1]?.stroke,
          }}
          onBlur={(event) => textAreaBlurHandler(event.target.value)}
        />
      )}
      <canvas
        ref={canvasRef}
        id="canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
    </>
  );
}

export default Board;
