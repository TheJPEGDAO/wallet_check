import React from "react";
import "./App.css";
import {BrowserRouter, Navigate, Routes, Route, useLocation} from "react-router-dom";
import Home from "./Home";

const applicationBasename = process.env.PUBLIC_URL + (process.env.PUBLIC_URL.endsWith("/") ? "" : "/");

const NotFound = () => {
    return <div><h1>404</h1>not found</div>
};

const CheckClientSideRouting = () => {
    const location = useLocation();
    return location.pathname.indexOf(applicationBasename) === -1
        ? <><NotFound />
            <h2>no client side routing</h2>
            <p>if you see this, client side-routing is not configured correctly.
                please check if <code>"homepage"</code>-property is pointing to the correct URL.</p>
        </>
        : null
}

const App = () => {
  return (<>
          <BrowserRouter basename={applicationBasename}>
            <Routes>
                <Route path={"/"} element={<Navigate to="/home" replace />}/>
                <Route path={"/home"} element={<Home />} />
                <Route path={"*"} element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          {/*
          the following router-section helps to detect configuration errors
          it's not useful in a productive environment
          please remove when the page is working
          */}
          <BrowserRouter>
              <Routes>
                  <Route path={"*"} element={<CheckClientSideRouting />}/>
              </Routes>
          </BrowserRouter>
      </>
  );
}

export default App;
