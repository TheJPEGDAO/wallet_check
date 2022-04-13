import React from "react";
import "./App.css";
import {BrowserRouter,/* Navigate,*/ Routes, Route} from "react-router-dom";
import Home from "./Home";

const applicationBasename = process.env.PUBLIC_URL + (process.env.PUBLIC_URL.endsWith("/") ? "" : "/");

const NotFound = () => {
    return <div><h1>404</h1>not found</div>
};

const App = () => {
  return (<div className="App">
          <BrowserRouter basename={applicationBasename}>
            <Routes>
                {/*<Route path={"/"} element={<Navigate to="/home" replace />}/>*/}
                <Route path={"/"} element={<Home />} />
                <Route path={"*"} element={<NotFound />} />
            </Routes>
          </BrowserRouter>
      </div>
  );
}

export default App;
