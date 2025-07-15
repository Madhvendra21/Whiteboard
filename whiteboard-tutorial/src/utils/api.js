// utils/api.js
import axios from "axios";

const API_BASE_URL = "https://api-whiteboard-az.onrender.com/api/canvas"; 

const token = localStorage.getItem('whiteboard_user_token')
const canvasId = localStorage.getItem('canvas_id')

export const updateCanvas = async (canvasId, elements) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/update`,
      { canvasId, elements },
      {
        headers: {
          Authorization: token,
        },
      }
    );
    console.log("Canvas updated successfully in the database!", response.data);
    return response.data;
  } catch (error) {
    // console.error("Error updating canvas:", error);
  }
};

export const fetchInitialCanvasElements = async (canvasId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/load/${canvasId}`, {
      headers: {
        Authorization: token,
      },
    });
    return response.data.elements;
  } catch (error) {
    console.error("Error fetching initial canvas elements:", error);
  }
};
