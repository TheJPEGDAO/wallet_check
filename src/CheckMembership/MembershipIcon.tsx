import {Avatar, Image} from "antd";
import logoSilver from "../silver.gif";
import logoGold from "../gold.gif";
import React from "react";
import BigNumber from "bignumber.js";

type MembershipIconProps = {
    balance?: BigNumber;
}

const MembershipIcon = (props: MembershipIconProps) => {
    const { balance } = props;

    return <Avatar
        style={{border: "1px solid #1890ff"}}
        shape={"circle"}
        icon={balance ? <Image
            height={30}
            width={30}
            src={(balance?.lt(100000)
                    ? logoSilver
                    : logoGold
            )}
            preview={false}
        /> : undefined}
        size={32}
    />
};

export default MembershipIcon;
