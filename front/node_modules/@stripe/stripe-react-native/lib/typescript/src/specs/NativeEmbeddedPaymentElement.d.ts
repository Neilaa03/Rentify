import type { HostComponent, ViewProps } from 'react-native';
import { EmbeddedPaymentElementConfiguration } from '../types/EmbeddedPaymentElement';
import { IntentConfiguration } from '../types/PaymentSheet';
import type { UnsafeMixed } from './utils';
export interface NativeProps extends ViewProps {
    configuration: UnsafeMixed<EmbeddedPaymentElementConfiguration>;
    intentConfiguration: UnsafeMixed<IntentConfiguration>;
}
export interface NativeCommands {
    confirm: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
    clearPaymentOption: (viewRef: React.ElementRef<HostComponent<NativeProps>>) => void;
}
export declare const Commands: NativeCommands;
type ComponentType = HostComponent<NativeProps>;
declare const _default: ComponentType;
export default _default;
//# sourceMappingURL=NativeEmbeddedPaymentElement.d.ts.map