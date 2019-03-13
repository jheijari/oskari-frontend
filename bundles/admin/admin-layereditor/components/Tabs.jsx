import React from 'react';
import PropTypes from 'prop-types';
import AntTabs from 'antd/lib/tabs';
import 'antd/lib/tabs/style/css';

export const Tabs = ({children, ...other}) => {
    return (
        <AntTabs {...other}>
            {children}
        </AntTabs>
    );
};

Tabs.propTypes = {
    children: PropTypes.any
};
