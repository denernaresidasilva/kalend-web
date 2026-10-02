import { Button, type ButtonProps } from "./button";
export function IconButton(props: ButtonProps & { "aria-label": string }) {
  return <Button {...props} variant={props.variant ?? "ghost"} className={`k-icon-button ${props.className ?? ""}`} />;
}
