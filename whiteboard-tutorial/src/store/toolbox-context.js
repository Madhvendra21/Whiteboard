import { createContext } from "react";

const toolboxContext = createContext({
  toolboxState: {},
  changeStroke: () => {},
  changeFill: () => {},
  changeSize: () => {},
});

export default toolboxContext;
