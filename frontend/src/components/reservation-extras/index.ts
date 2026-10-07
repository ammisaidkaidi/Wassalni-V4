// Barrel re-export mirroring the original React `ReservationExtras.tsx`
// module's named exports (ConversationAction, RevealContactAction,
// ShareLinkAction, PassengersAction, RequirementsAction), split into one
// .vue SFC per component (Vue convention), kept importable the same way:
// `import { ConversationAction, ... } from '../components/reservation-extras'`.
export { default as ConversationAction } from './ConversationAction.vue';
export { default as RevealContactAction } from './RevealContactAction.vue';
export { default as ShareLinkAction } from './ShareLinkAction.vue';
export { default as PassengersAction } from './PassengersAction.vue';
export { default as RequirementsAction } from './RequirementsAction.vue';
