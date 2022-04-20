import React, {useMemo} from "react";
import "./App.css";
import {BrowserRouter, Navigate, Routes, Route, Link, useLocation} from "react-router-dom";
import Home from "./Home";
import {Layout, Menu} from "antd";
import {Content, Footer, Header} from "antd/lib/layout/layout";

const applicationBasename = process.env.PUBLIC_URL + (process.env.PUBLIC_URL.endsWith("/") ? "" : "/");

const NotFound = () => {
    return <div><h1>404</h1>not found</div>
};

const App = (): JSX.Element => {
    const currentLocation = useLocation();
    const activeMenuKey = useMemo(() => {
        const navKeys: { [name: string]: string } = {
            "/snapshot": "nav:snapshot",
            "/snapshot/": "nav:snapshot",
            "/snapshots": "nav:snapshots",
            "/snapshots/": "nav:snapshots",
        }

        const key = Object.keys(navKeys).find(k => k === currentLocation.pathname);
        if (key) {
            return navKeys[key];
        }
    }, [currentLocation.pathname]);

    return (<div className="App">
            <Layout>
                <Header className={"pageHeader"}>
                    <div className={"jpegdaologo"}/>
                    <Menu
                        selectable={true}
                        mode={"horizontal"}
                        theme={"dark"}
                        selectedKeys={!!activeMenuKey?[activeMenuKey]:[]}
                        activeKey={activeMenuKey}
                    >
                        <Menu.Item key={"nav:snapshot"}><Link to={"/snapshot"}>Take a snapshot</Link></Menu.Item>
                        {/* <Menu.Item key={"nav:snapshots"}><Link to={"/snapshots"}>Show scheduled snapshots</Link></Menu.Item> */ }
                    </Menu>
                </Header>
                <Content className={"pageContent"}>
                    <Routes>
                        {<Route path={"/"} element={<Navigate to="/snapshot" replace/>}/>}

                        <Route path={"/snapshot"} element={<Home/>}/>
                        <Route path={"/snapshots"} element={<Home/>}/>
                        <Route path={"*"} element={<NotFound/>}/>
                    </Routes>
                </Content>
                <Footer style={{ textAlign: 'center' }}>
                    <p>A service by the <a href={"https://thejpegdao.com"} target={"_blank"} rel={"_noref"}>JPEG DAO</a> on stellar network 🚀</p>
                    <p>Follow us on <a href={"https://twitter.com/thejpegdao"} target={"_blank"} rel={"_noref"}>twitter</a>, <a href={"https://instagram.com/thejpegdao/"}>Instagram</a></p>
                    <p>Join our <a href={"https://discord.gg/UbJvFUHnY2"} target={"_blank"} rel={"_noref"}>discord</a></p>
                    <p>Contribute on <a href={"https://github.com/thejpegdao"} target={"_blank"} rel={"_noref"}>github</a></p>
                </Footer>
            </Layout>

        </div>
    );
}

const RoutedApp = () =>
    <BrowserRouter basename={applicationBasename}><App/></BrowserRouter>

export default RoutedApp;
