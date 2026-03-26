import styled from 'styled-components/macro';
import tw, { theme } from 'twin.macro';

const SubNavigation = styled.div`
    ${tw`w-full border-b overflow-x-auto`};
    border-color: rgba(255, 255, 255, 0.07);
    background: rgba(12, 15, 24, 0.88);

    & > div {
        ${tw`flex items-center text-sm mx-auto px-2`};
        max-width: 1200px;

        & > a,
        & > div {
            ${tw`inline-block py-3 px-4 no-underline whitespace-nowrap transition-all duration-150`};
            color: #a0a8bb;

            &:not(:first-of-type) {
                ${tw`ml-2`};
            }

            &:hover {
                color: #ecf0f8;
            }

            &:active,
            &.active {
                color: #f7f9ff;
                box-shadow: inset 0 -2px ${theme`colors.cyan.500`.toString()};
            }
        }
    }
`;

export default SubNavigation;
