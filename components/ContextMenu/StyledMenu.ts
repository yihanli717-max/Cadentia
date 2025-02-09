import styled from "styled-components";
import { Menu } from "react-contexify";

export const StyledMenu = styled(Menu)`
  background: #fff !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  padding: 6px !important;

  /* Item Active */
  .react-contexify__item--active {
    background: #000 !important;
    color: #fff !important;
    border-radius: 6px !important;
    transition: all 0.2s ease !important;
  }

  /* Hover */
  .react-contexify__item:not(.react-contexify__item--disabled):hover {
    background: #000 !important;
    color: #fff !important;
  }

  /* Text */
  .react-contexify__item__content {
    font-size: 0.875rem !important;
    padding: 8px 12px !important;
  }
`;
