
import React from 'react';
import PropTypes from 'prop-types';
import { Badge, CollapsePanel, List, ListItem } from 'oskari-ui';
import { Layer } from './Layer/';
import styled from 'styled-components';

const StyledCollapsePanel = styled(CollapsePanel)`
    & > div:first-child {
        min-height: 22px;
    }
`;
const StyledListItem = styled(ListItem)`
    padding: 0 !important;
    display: block !important;
    &:first-child > div {
        padding-top: 10px;
    }
    &:last-child > div {
        padding-bottom: 10px;
    }
`;

const renderLayer = ({ model, even, selected, mutator, locale }) => {
    const itemProps = { model, even, selected, mutator, locale };
    return (
        <StyledListItem>
            <Layer key={model.getId()} {...itemProps} />
        </StyledListItem>
    );
};
renderLayer.propTypes = {
    model: PropTypes.any,
    even: PropTypes.any,
    selected: PropTypes.any,
    mutator: PropTypes.any,
    locale: PropTypes.any
};

const LayerCollapsePanel = (props) => {
    const { group, selectedLayerIds, mutator, locale, ...propsNeededForPanel } = props;
    const layerRows = group.getLayers().map((layer, index) => {
        const layerProps = {
            model: layer,
            even: index % 2 === 0,
            selected: Array.isArray(selectedLayerIds) && selectedLayerIds.includes(layer.getId()),
            mutator,
            locale
        };
        return layerProps;
    });
    const badgeText = group.unfilteredLayerCount
        ? layerRows.length + ' / ' + group.unfilteredLayerCount
        : layerRows.length;
    return (
        <StyledCollapsePanel {...propsNeededForPanel}
            header={group.getTitle()}
            extra={<Badge inversed={true} count={badgeText}/>}
        >
            <List bordered={false} dataSource={layerRows} renderItem={renderLayer}/>
        </StyledCollapsePanel>
    );
};

LayerCollapsePanel.propTypes = {
    group: PropTypes.any.isRequired,
    selectedLayerIds: PropTypes.array.isRequired,
    mutator: PropTypes.any.isRequired,
    locale: PropTypes.any.isRequired
};

const comparisonFn = (prevProps, nextProps) => {
    // expandIcon is something the parent component adds as a context
    const ignored = ['expandIcon'];
    const arrayChildCheck = ['selectedLayerIds'];
    let useMemoized = true;
    Object.getOwnPropertyNames(nextProps).forEach(name => {
        if (ignored.includes(name)) {
            return;
        }
        if (arrayChildCheck.includes(name)) {
            if (!Oskari.util.arraysEqual(nextProps[name], prevProps[name])) {
                useMemoized = false;
            }
            return;
        }
        if (nextProps[name] !== prevProps[name]) {
            useMemoized = false;
        }
    });
    return useMemoized;
};
const memoized = React.memo(LayerCollapsePanel, comparisonFn);
export { memoized as LayerCollapsePanel };
