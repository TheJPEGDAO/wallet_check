import React, {useMemo} from "react";
import "./App.css";
import {BrowserRouter, Navigate, Routes, Route, Link, useLocation} from "react-router-dom";
import TakeSnapshot from "./TakeSnapshot";
import Snapshots from "./Snapshots";
import {Layout, Menu, Space} from "antd";
import {Content, Footer, Header} from "antd/lib/layout/layout";
import {GithubOutlined, InstagramOutlined, TwitterOutlined} from "@ant-design/icons";
import Discord from "./discord";
import Eligibility from "./Eligibility";

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
                        <Menu.Item key={"nav:snapshots"}><Link to={"/snapshots/"}>Show recent snapshots</Link></Menu.Item>
                        <Menu.Item key={"nav:member"}><Link to={"/member/"}>Check account membership</Link></Menu.Item>
                    </Menu>
                </Header>
                <Content className={"pageContent"}>
                    <Routes>
                        {<Route path={"/"} element={<Navigate to="/snapshot/" replace/>}/>}
                        <Route path={"/snapshots"} element={<Navigate to="/snapshots/" replace/>}/>
                        <Route path={"/snapshot/"} element={<TakeSnapshot/>}/>
                        <Route path={"/snapshots/"} element={<Snapshots/>}/>
                        <Route path={"/member/"} element={<Eligibility/>}/>
                        <Route path={"*"} element={<NotFound/>}/>
                    </Routes>
                </Content>
                <Footer style={{ textAlign: 'center' }}>
                    <Space direction={"horizontal"} split={"|"} align={"baseline"}>
                        <p>A service by the <a href="https://thejpegdao.com" target="_blank" rel="noreferrer">JPEG DAO</a> on the <a href="https://stellar.org" target="_blank" rel="noreferrer">stellar</a> network 🚀</p>
                        <p>follow us on <a href="https://twitter.com/thejpegdao" target="_blank" rel="noreferrer"><TwitterOutlined /> twitter</a>&nbsp;&&nbsp;
                            <a href={"https://instagram.com/thejpegdao/"}><InstagramOutlined /> Instagram</a></p>
                        <p>join our <a href="https://discord.gg/UbJvFUHnY2" target="_blank" rel="noreferrer"><Discord /> discord</a></p>
                        <p>collaborate on <a href="https://github.com/thejpegdao" target="_blank" rel="noreferrer"><GithubOutlined /> github</a></p>
                    </Space>
                    <br />
                    <Space direction={"horizontal"}>
                        The JPEG DAO is not affiliated or endorsed by SDF. This is not an official stellar product.
                    </Space>
                </Footer>
            </Layout>

        </div>
    );
}

const RoutedApp = () =>
    <BrowserRouter basename={applicationBasename}><App/></BrowserRouter>

export default RoutedApp;
