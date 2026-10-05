SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict n0swudxw4yHtJKCEERWaZ5ClusTw9f7ahwW5NtnBj0qFugHIDY6LaJWzfioqDrF

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."custom_oauth_providers" ("id", "provider_type", "identifier", "name", "client_id", "client_secret", "acceptable_client_ids", "scopes", "pkce_enabled", "attribute_mapping", "authorization_params", "enabled", "email_optional", "issuer", "discovery_url", "skip_nonce_check", "cached_discovery", "discovery_cached_at", "authorization_url", "token_url", "userinfo_url", "jwks_uri", "created_at", "updated_at", "custom_claims_allowlist") FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
00000000-0000-0000-0000-000000000000	eaa51f70-1501-468f-a492-03b08723316b	authenticated	authenticated	client2@demo.test	$2a$06$KSUv9Ke7uFc1Z19AIiXka.zcodgSn27/JkS.4WZAlNjuKFrEYZfmy	2026-10-02 00:01:14.090525+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"role": "client", "full_name": "Yacine Demo"}	\N	2026-10-02 00:01:14.090525+00	2026-10-02 00:01:14.090525+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	30e2a946-5193-43c6-a95c-d91b0f117007	authenticated	authenticated	admin@demo.test	$2a$06$3D5Qjwdv77VaN2Uy26PsluAX0OYSHtZ6mkHt64kWe4G4ILrcH85iC	2026-10-02 00:01:14.090525+00	\N		\N		\N			\N	\N	{"provider": "email", "providers": ["email"]}	{"role": "client", "full_name": "Admin Demo"}	\N	2026-10-02 00:01:14.090525+00	2026-10-02 00:01:14.090525+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	171a88fd-0358-4e0d-8f54-8da2fe87ca58	authenticated	authenticated	driver@demo.test	$2a$06$9E3zIoFbI5dd633I9uQSieqwCEmps/Lo62jyXrSBo4R44tegDrQiO	2026-10-02 00:01:14.090525+00	\N		\N		\N			\N	2026-10-02 06:45:19.004775+00	{"provider": "email", "providers": ["email"]}	{"role": "driver", "full_name": "Karim Demo"}	\N	2026-10-02 00:01:14.090525+00	2026-10-02 06:45:19.011022+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	bd50c935-dabb-432b-904f-c776232e6d4e	authenticated	authenticated	client@demo.test	$2a$06$NiIbqM/5n.XPbsxQN8WJw.PBRaAptYOIpxTN5bhs/0koJ13D.F7Du	2026-10-02 00:01:14.090525+00	\N		\N		\N			\N	2026-10-02 06:47:24.274229+00	{"provider": "email", "providers": ["email"]}	{"role": "client", "full_name": "Amina Demo"}	\N	2026-10-02 00:01:14.090525+00	2026-10-02 06:47:24.285723+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
bd50c935-dabb-432b-904f-c776232e6d4e	bd50c935-dabb-432b-904f-c776232e6d4e	{"sub": "bd50c935-dabb-432b-904f-c776232e6d4e", "email": "client@demo.test"}	email	2026-10-02 00:01:14.090525+00	2026-10-02 00:01:14.090525+00	2026-10-02 00:01:14.090525+00	2bf16c96-c8e1-472f-8187-24e7f0d788ea
eaa51f70-1501-468f-a492-03b08723316b	eaa51f70-1501-468f-a492-03b08723316b	{"sub": "eaa51f70-1501-468f-a492-03b08723316b", "email": "client2@demo.test"}	email	2026-10-02 00:01:14.090525+00	2026-10-02 00:01:14.090525+00	2026-10-02 00:01:14.090525+00	bc9126db-514c-4028-b1d8-05c1e9c88ea4
171a88fd-0358-4e0d-8f54-8da2fe87ca58	171a88fd-0358-4e0d-8f54-8da2fe87ca58	{"sub": "171a88fd-0358-4e0d-8f54-8da2fe87ca58", "email": "driver@demo.test"}	email	2026-10-02 00:01:14.090525+00	2026-10-02 00:01:14.090525+00	2026-10-02 00:01:14.090525+00	cb46a13c-f623-4227-94e8-421c6d5a0459
30e2a946-5193-43c6-a95c-d91b0f117007	30e2a946-5193-43c6-a95c-d91b0f117007	{"sub": "30e2a946-5193-43c6-a95c-d91b0f117007", "email": "admin@demo.test"}	email	2026-10-02 00:01:14.090525+00	2026-10-02 00:01:14.090525+00	2026-10-02 00:01:14.090525+00	c39ab015-5e5d-44f7-ac76-39ff37195be5
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_clients" ("id", "client_secret_hash", "registration_type", "redirect_uris", "grant_types", "client_name", "client_uri", "logo_uri", "created_at", "updated_at", "deleted_at", "client_type", "token_endpoint_auth_method") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") FROM stdin;
d1f36faa-f4db-4bef-9748-d14ffb0f1588	bd50c935-dabb-432b-904f-c776232e6d4e	2026-10-02 00:26:36.219832+00	2026-10-02 00:26:36.219832+00	\N	aal1	\N	\N	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	129.45.76.190	\N	\N	\N	\N	\N
a0d6d808-9ab1-4a12-9e26-a17f27609ff3	bd50c935-dabb-432b-904f-c776232e6d4e	2026-10-02 06:47:24.274923+00	2026-10-02 06:47:24.274923+00	\N	aal1	\N	\N	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	129.45.76.190	\N	\N	\N	\N	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
d1f36faa-f4db-4bef-9748-d14ffb0f1588	2026-10-02 00:26:36.222501+00	2026-10-02 00:26:36.222501+00	password	2fd3ce51-db5e-45c8-8456-5a94427bdfba
a0d6d808-9ab1-4a12-9e26-a17f27609ff3	2026-10-02 06:47:24.288461+00	2026-10-02 06:47:24.288461+00	password	4daa7a5e-d3f2-4c37-a0ad-04e9f13c0890
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid", "last_webauthn_challenge_data") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: mfa_recovery_code_sets; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_recovery_code_sets" ("id", "user_id", "mfa_factor_id", "failed_verification_count", "verification_locked_until", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: mfa_recovery_codes; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_recovery_codes" ("id", "mfa_recovery_code_set_id", "code_hash", "consumed_at", "created_at") FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_authorizations" ("id", "authorization_id", "client_id", "user_id", "redirect_uri", "scope", "state", "resource", "code_challenge", "code_challenge_method", "response_type", "status", "authorization_code", "created_at", "expires_at", "approved_at", "nonce") FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_client_states" ("id", "provider_type", "code_verifier", "created_at") FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."oauth_consents" ("id", "user_id", "client_id", "scopes", "granted_at", "revoked_at") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	7	vhmcw7ocxbzk	bd50c935-dabb-432b-904f-c776232e6d4e	f	2026-10-02 00:26:36.2212+00	2026-10-02 00:26:36.2212+00	\N	d1f36faa-f4db-4bef-9748-d14ffb0f1588
00000000-0000-0000-0000-000000000000	10	2dwm7woerpri	bd50c935-dabb-432b-904f-c776232e6d4e	f	2026-10-02 06:47:24.282201+00	2026-10-02 06:47:24.282201+00	\N	a0d6d808-9ab1-4a12-9e26-a17f27609ff3
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at", "disabled") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: scim_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."scim_tokens" ("id", "sso_provider_id", "token_hash", "prefix", "created_at", "expires_at", "revoked_at", "last_used_at") FROM stdin;
\.


--
-- Data for Name: scim_users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."scim_users" ("id", "sso_provider_id", "user_id", "resource", "created_at", "updated_at", "deleted_at") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_challenges" ("id", "user_id", "challenge_type", "session_data", "created_at", "expires_at") FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."webauthn_credentials" ("id", "user_id", "credential_id", "public_key", "attestation_type", "aaguid", "sign_count", "transports", "backup_eligible", "backed_up", "friendly_name", "created_at", "updated_at", "last_used_at") FROM stdin;
\.


--
-- Data for Name: admin_audit_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."admin_audit_log" ("id", "admin_user_id", "action", "target_type", "target_id", "before_data", "after_data", "reason", "created_at") FROM stdin;
4734b863-4ff6-4f80-a205-2740b10c23d2	7be40049-a06f-4a22-8fbe-a3499fbc9386	reschedule_trip	trip	5aa4485e-c7bf-4e14-8b6f-f5fdc61481a3	{"departure_at": "2026-10-07T18:39:56.403371+00:00"}	{"departure_at": "2026-10-09T18:40:08.399094+00:00"}	Driver vehicle breakdown	2026-10-04 18:40:08.399094+00
f3b66e1b-fb98-4bbf-8ba7-fe1aeb209a16	7be40049-a06f-4a22-8fbe-a3499fbc9386	resolve_sos	sos_event	a62978b6-fc3e-4308-bc54-a7075ecf5748	{"id": "a62978b6-fc3e-4308-bc54-a7075ecf5748", "notes": "smoke test sos", "status": "open", "gps_lat": null, "gps_lon": null, "trip_id": null, "created_at": "2026-10-04T18:49:58.833563+00:00", "resolved_at": null, "resolved_by": null, "reservation_id": null, "triggered_by_id": "3aa2c9e5-3c34-4658-ad82-ef3265b17ecf", "triggered_by_role": "customer"}	{"status": "resolved"}	resolved by smoke test	2026-10-04 18:50:04.304175+00
5c3d5576-9865-41c3-a0c4-6ee74fad417a	7be40049-a06f-4a22-8fbe-a3499fbc9386	change_configuration	app_setting	no_show_strike_threshold	{"key": "no_show_strike_threshold", "value": "3", "updated_at": "2026-10-04 16:32:10.4+00"}	{"value": "3"}	\N	2026-10-04 18:50:27.979363+00
c5f02816-d427-47c8-88a5-b3bd6ff41179	7be40049-a06f-4a22-8fbe-a3499fbc9386	resolve_sos	sos_event	0a75a9a0-9aae-48f3-943f-d2c860a874e3	{"id": "0a75a9a0-9aae-48f3-943f-d2c860a874e3", "notes": "smoke test sos", "status": "open", "gps_lat": null, "gps_lon": null, "trip_id": null, "created_at": "2026-10-04T18:51:00.060388+00:00", "resolved_at": null, "resolved_by": null, "reservation_id": null, "triggered_by_id": "3aa2c9e5-3c34-4658-ad82-ef3265b17ecf", "triggered_by_role": "customer"}	{"status": "resolved"}	resolved by smoke test	2026-10-04 18:51:05.398013+00
9d3c7ca1-ac64-4e30-a975-6ce6eb9bb87d	7be40049-a06f-4a22-8fbe-a3499fbc9386	resolve_sos	sos_event	9d4b3e5b-55ba-445c-9ff2-2d12de747759	{"id": "9d4b3e5b-55ba-445c-9ff2-2d12de747759", "notes": "smoke test sos", "status": "open", "gps_lat": null, "gps_lon": null, "trip_id": null, "created_at": "2026-10-04T18:52:30.800998+00:00", "resolved_at": null, "resolved_by": null, "reservation_id": null, "triggered_by_id": "3aa2c9e5-3c34-4658-ad82-ef3265b17ecf", "triggered_by_role": "customer"}	{"status": "resolved"}	resolved by smoke test	2026-10-04 18:52:36.13095+00
829729e7-5fdf-4b63-9602-1629c69c90f9	7be40049-a06f-4a22-8fbe-a3499fbc9386	change_configuration	app_setting	no_show_strike_threshold	{"key": "no_show_strike_threshold", "value": "3", "updated_at": "2026-10-04 18:50:26.646587+00"}	{"value": "3"}	\N	2026-10-04 18:53:00.272105+00
a6dc4bb0-d716-499a-b57c-ed91179cd2ce	7be40049-a06f-4a22-8fbe-a3499fbc9386	reschedule_trip	trip	aaa0be8e-cf8c-4a9a-bcb3-e63f815ed6e7	{"departure_at": "2026-10-05T18:37:00+00:00"}	{"departure_at": "2026-10-05T18:57:09.053+00:00"}	smoke test reschedule	2026-10-04 18:57:11.670368+00
69b01f9c-5b53-4456-bf4b-6096b6c0d125	7be40049-a06f-4a22-8fbe-a3499fbc9386	suspend_account	app_user	1c51c261-841e-41ea-96fc-7d2400be8edc	\N	\N	smoke test	2026-10-04 18:57:16.506049+00
113cad5d-2af4-40d6-9333-c82b1464c416	7be40049-a06f-4a22-8fbe-a3499fbc9386	unsuspend_account	app_user	1c51c261-841e-41ea-96fc-7d2400be8edc	\N	\N	\N	2026-10-04 18:57:22.618416+00
ba1ba17f-05f2-40de-96f9-aed9aca84f10	5d181db1-6d9f-4dfa-b9ae-7215318eec08	resolve_sos	sos_event	8d59f42b-12d5-4c89-b550-ded287e5aeba	{"id": "8d59f42b-12d5-4c89-b550-ded287e5aeba", "notes": "smoke test", "status": "open", "gps_lat": 36.750000, "gps_lon": 3.060000, "trip_id": "5aa4485e-c7bf-4e14-8b6f-f5fdc61481a3", "created_at": "2026-10-04T19:18:33.312992+00:00", "resolved_at": null, "resolved_by": null, "reservation_id": "979a9526-335f-4466-bd40-04f3a3996811", "triggered_by_id": "5d181db1-6d9f-4dfa-b9ae-7215318eec08", "triggered_by_role": "customer"}	{"status": "resolved"}	smoke-resolved	2026-10-04 19:18:36.536802+00
2defacdb-3f13-4a1f-8bb0-e5b686a7fb75	7be40049-a06f-4a22-8fbe-a3499fbc9386	resolve_sos	sos_event	71b16b40-24c6-47df-b01b-9f9447f8584e	{"id": "71b16b40-24c6-47df-b01b-9f9447f8584e", "notes": "there a big problem", "status": "open", "gps_lat": null, "gps_lon": null, "trip_id": null, "created_at": "2026-10-04T19:06:49.63925+00:00", "resolved_at": null, "resolved_by": null, "reservation_id": null, "triggered_by_id": "46146536-85db-42d6-9dd0-af396fef94ce", "triggered_by_role": "driver"}	{"status": "resolved"}	resolved by smoke test	2026-10-04 19:18:54.536377+00
9fa5c192-3556-4239-812c-c3d6060a5dea	ee651e63-0fd3-44a4-88ff-9fa4dbd4a30f	run_backup	backup	backup-2026-10-04T21-44-34-467Z	\N	{"tables": 52, "sizeBytes": 391987}	\N	2026-10-04 21:45:52.184618+00
1a28ed4e-01e5-4f52-b735-c394f91ffc80	27cdf3f7-0927-4db1-8032-4a92dc86d97f	wallet_adjustment	customer	059f05e2-e431-4920-a8b6-fa3403dcb1ba	\N	{"amount": 1000, "description": "E2E test top-up"}	E2E test top-up	2026-10-05 08:40:07.394931+00
1b28d3df-006d-48fe-8f5b-cd1674bf2a2a	601654de-c410-4106-b455-169cc24439f2	wallet_adjustment	customer	fe3d10ca-3725-45a8-a414-452baee7ce3d	\N	{"amount": 1000, "description": "E2E test top-up"}	E2E test top-up	2026-10-05 14:03:36.540421+00
\.


--
-- Data for Name: pays; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."pays" ("id", "code_iso", "nom_ar", "nom_fr", "nom_en") FROM stdin;
1	DZ	الجزائر	Algérie	Algeria
\.


--
-- Data for Name: wilaya; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."wilaya" ("id", "pays_id", "code", "nom_ar", "nom_fr", "nom_en", "created_at") FROM stdin;
1	1	01	أدرار	Adrar	Adrar	2026-10-02 19:56:51.896415+00
2	1	02	الشلف	Chlef	Chlef	2026-10-02 19:56:51.896415+00
3	1	03	الأغواط	Laghouat	Laghouat	2026-10-02 19:56:51.896415+00
4	1	04	أم البواقي	Oum El Bouaghi	Oum El Bouaghi	2026-10-02 19:56:51.896415+00
5	1	05	باتنة	Batna	Batna	2026-10-02 19:56:51.896415+00
6	1	06	بجاية	Bejaia	Bejaia	2026-10-02 19:56:51.896415+00
7	1	07	بسكرة	Biskra	Biskra	2026-10-02 19:56:51.896415+00
8	1	08	بشار	Bechar	Bechar	2026-10-02 19:56:51.896415+00
9	1	09	البليدة	Blida	Blida	2026-10-02 19:56:51.896415+00
10	1	10	البويرة	Bouira	Bouira	2026-10-02 19:56:51.896415+00
11	1	11	تمنراست	Tamanrasset	Tamanrasset	2026-10-02 19:56:51.896415+00
12	1	12	تبسة	Tebessa	Tebessa	2026-10-02 19:56:51.896415+00
13	1	13	تلمسان	Tlemcen	Tlemcen	2026-10-02 19:56:51.896415+00
14	1	14	تيارت	Tiaret	Tiaret	2026-10-02 19:56:51.896415+00
15	1	15	تيزي وزو	Tizi Ouzou	Tizi Ouzou	2026-10-02 19:56:51.896415+00
16	1	16	الجزائر	Alger	Algiers	2026-10-02 19:56:51.896415+00
17	1	17	الجلفة	Djelfa	Djelfa	2026-10-02 19:56:51.896415+00
18	1	18	جيجل	Jijel	Jijel	2026-10-02 19:56:51.896415+00
19	1	19	سطيف	Setif	Setif	2026-10-02 19:56:51.896415+00
20	1	20	سعيدة	Saida	Saida	2026-10-02 19:56:51.896415+00
21	1	21	سكيكدة	Skikda	Skikda	2026-10-02 19:56:51.896415+00
22	1	22	سيدي بلعباس	Sidi Bel Abbes	Sidi Bel Abbes	2026-10-02 19:56:51.896415+00
23	1	23	عنابة	Annaba	Annaba	2026-10-02 19:56:51.896415+00
24	1	24	قالمة	Guelma	Guelma	2026-10-02 19:56:51.896415+00
25	1	25	قسنطينة	Constantine	Constantine	2026-10-02 19:56:51.896415+00
26	1	26	المدية	Medea	Medea	2026-10-02 19:56:51.896415+00
27	1	27	مستغانم	Mostaganem	Mostaganem	2026-10-02 19:56:51.896415+00
28	1	28	المسيلة	M'Sila	M'Sila	2026-10-02 19:56:51.896415+00
29	1	29	معسكر	Mascara	Mascara	2026-10-02 19:56:51.896415+00
30	1	30	ورقلة	Ouargla	Ouargla	2026-10-02 19:56:51.896415+00
31	1	31	وهران	Oran	Oran	2026-10-02 19:56:51.896415+00
32	1	32	البيض	El Bayadh	El Bayadh	2026-10-02 19:56:51.896415+00
33	1	33	إليزي	Illizi	Illizi	2026-10-02 19:56:51.896415+00
34	1	34	برج بوعريريج	Bordj Bou Arreridj	Bordj Bou Arreridj	2026-10-02 19:56:51.896415+00
35	1	35	بومرداس	Boumerdes	Boumerdes	2026-10-02 19:56:51.896415+00
36	1	36	الطارف	El Tarf	El Tarf	2026-10-02 19:56:51.896415+00
37	1	37	تندوف	Tindouf	Tindouf	2026-10-02 19:56:51.896415+00
38	1	38	تيسمسيلت	Tissemsilt	Tissemsilt	2026-10-02 19:56:51.896415+00
39	1	39	الوادي	El Oued	El Oued	2026-10-02 19:56:51.896415+00
40	1	40	خنشلة	Khenchela	Khenchela	2026-10-02 19:56:51.896415+00
41	1	41	سوق أهراس	Souk Ahras	Souk Ahras	2026-10-02 19:56:51.896415+00
42	1	42	تيبازة	Tipaza	Tipaza	2026-10-02 19:56:51.896415+00
43	1	43	ميلة	Mila	Mila	2026-10-02 19:56:51.896415+00
44	1	44	عين الدفلى	Ain Defla	Ain Defla	2026-10-02 19:56:51.896415+00
45	1	45	النعامة	Naama	Naama	2026-10-02 19:56:51.896415+00
46	1	46	عين تموشنت	Ain Temouchent	Ain Temouchent	2026-10-02 19:56:51.896415+00
47	1	47	غرداية	Ghardaia	Ghardaia	2026-10-02 19:56:51.896415+00
48	1	48	غليزان	Relizane	Relizane	2026-10-02 19:56:51.896415+00
49	1	49	تيميمون	Timimoun	Timimoun	2026-10-02 19:56:51.896415+00
50	1	50	برج باجي مختار	Bordj Badji Mokhtar	Bordj Badji Mokhtar	2026-10-02 19:56:51.896415+00
51	1	51	أولاد جلال	Ouled Djellal	Ouled Djellal	2026-10-02 19:56:51.896415+00
52	1	52	بني عباس	Beni Abbes	Beni Abbes	2026-10-02 19:56:51.896415+00
53	1	53	عين صالح	In Salah	In Salah	2026-10-02 19:56:51.896415+00
54	1	54	عين قزام	In Guezzam	In Guezzam	2026-10-02 19:56:51.896415+00
55	1	55	تقرت	Touggourt	Touggourt	2026-10-02 19:56:51.896415+00
56	1	56	جانت	Djanet	Djanet	2026-10-02 19:56:51.896415+00
57	1	57	المغير	El M'Ghair	El M'Ghair	2026-10-02 19:56:51.896415+00
58	1	58	المنيعة	El Meniaa	El Meniaa	2026-10-02 19:56:51.896415+00
59	1	59	أفلو	Aflou	Aflou	2026-10-02 19:56:51.896415+00
60	1	60	الأبيض سيدي الشيخ	El Abiodh Sidi Cheikh	El Abiodh Sidi Cheikh	2026-10-02 19:59:49.138998+00
61	1	61	العريشة	El Aricha	El Aricha	2026-10-02 19:59:49.138998+00
62	1	62	القنطرة	El Kantara	El Kantara	2026-10-02 19:59:49.138998+00
63	1	63	بريكة	Barika	Barika	2026-10-02 19:59:49.138998+00
64	1	64	بوسعادة	Bou Saada	Bou Saada	2026-10-02 19:59:49.138998+00
65	1	65	بير العاتر	Bir El Ater	Bir El Ater	2026-10-02 19:59:49.138998+00
66	1	66	قصر البخاري	Ksar El Boukhari	Ksar El Boukhari	2026-10-02 19:59:49.138998+00
67	1	67	قصر الشلالة	Ksar Chellala	Ksar Chellala	2026-10-02 19:59:49.138998+00
68	1	68	عين وسارة	Ain Oussara	Ain Oussara	2026-10-02 19:59:49.138998+00
69	1	69	مسعد	Messaad	Messaad	2026-10-02 19:59:49.138998+00
\.


--
-- Data for Name: daira; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."daira" ("id", "wilaya_id", "nom_ar", "nom_fr", "nom_en") FROM stdin;
551	1	أولف	Aoulef	Aoulef
552	1	أدرار	Adrar	Adrar
553	1	فنوغيل	Fenoughil	Fenoughil
554	1	زاوية كنتة	Zaouiat Kounta	Zaouiat Kounta
555	1	رقان	Reggane	Reggane
556	1	تسابيت	Tsabit	Tsabit
557	2	أبو الحسن	Abou El Hassane	Abou El Hassane
558	2	الزبوجة	Zeboudja	Zeboudja
559	2	أولاد بن عبد القادر	Ouled Ben Abdelkader	Ouled Ben Abdelkader
560	2	عين مران	Ain Merane	Ain Merane
561	2	بني حواء	Beni Haoua	Beni Haoua
562	2	وادي الفضة	Oued Fodda	Oued Fodda
563	2	المرسى	El Marsa	El Marsa
564	2	الشلف	Chlef	Chlef
565	2	تنس	Tenes	Tenes
566	2	الكريمية	El Karimia	El Karimia
567	2	تاوقريت	Taougrit	Taougrit
568	2	أولاد فارس	Ouled Fares	Ouled Fares
569	2	بوقادير	Boukadir	Boukadir
570	3	عين ماضي	Ain Madhi	Ain Madhi
571	3	الأغواط	Laghouat	Laghouat
572	3	قصر الحيران	Ksar El Hirane	Ksar El Hirane
573	3	سيدي مخلوف	Sidi Makhlouf	Sidi Makhlouf
574	3	حاسي الرمل	Hassi R'mel	Hassi R'mel
575	4	فكيرينة	F'kirina	F'kirina
576	4	عين فكرون	Ain Fekroun	Ain Fekroun
577	4	مسكيانة	Meskiana	Meskiana
578	4	قصر الصباحي	Ksar Sbahi	Ksar Sbahi
579	4	سوق نعمان	Souk Naamane	Souk Naamane
580	4	أم البواقي	Oum El Bouaghi	Oum El Bouaghi
581	4	عين ببوش	Ain Babouche	Ain Babouche
582	4	عين البيضاء	Ain Beida	Ain Beida
583	4	عين مليلة	Ain M'lila	Ain M'lila
584	4	سيقوس	Sigus	Sigus
585	4	الضلعة	Dhalaa	Dhalaa
586	4	عين كرشة	Ain Kercha	Ain Kercha
587	5	عين التوتة	Ain Touta	Ain Touta
588	5	رأس العيون	Ras El Aioun	Ras El Aioun
589	5	تيمقاد	Timgad	Timgad
590	5	أولاد سي سليمان	Ouled Si Slimane	Ouled Si Slimane
591	5	ثنية العابد	Theniet El Abed	Theniet El Abed
592	5	باتنة	Batna	Batna
593	5	مروانة	Merouana	Merouana
594	5	سريانة	Seriana	Seriana
595	5	منعة	Menaa	Menaa
596	5	المعذر	El Madher	El Madher
597	5	تازولت	Tazoult	Tazoult
598	5	نقاوس	N'gaous	N'gaous
599	5	أريس	Arris	Arris
600	5	عين جاسر	Ain Djasser	Ain Djasser
601	5	إشمول	Ichemoul	Ichemoul
602	5	بوزينة	Bouzina	Bouzina
603	5	الشمرة	Chemora	Chemora
604	5	تكوت	Tkout	Tkout
605	6	سيدي عيش	Sidi Aich	Sidi Aich
606	6	برباشة	Barbacha	Barbacha
607	6	القصر	El Kseur	El Kseur
608	6	خراطة	Kherrata	Kherrata
609	6	بجاية	Bejaia	Bejaia
610	6	بني معوش	Beni Maouche	Beni Maouche
611	6	أميزور	Amizour	Amizour
612	6	تيمزريت	Timezrit	Timezrit
613	6	سوق الإثنين	Souk El Tenine	Souk El Tenine
614	6	تيشي	Tichy	Tichy
615	6	إغيل علي	Ighil Ali	Ighil Ali
616	6	درقينة	Darguina	Darguina
617	6	أوقاس	Aokas	Aokas
618	6	أدكار	Adekar	Adekar
619	6	أقبو	Akbou	Akbou
620	6	صدوق	Seddouk	Seddouk
621	6	تازملت	Tazmalt	Tazmalt
622	6	شميني	Chemini	Chemini
623	6	إفري أوزلاقن	Ifri Ouzellaguene	Ifri Ouzellaguene
624	7	زريبة الوادي	Zeribet El Oued	Zeribet El Oued
625	7	طولقة	Tolga	Tolga
626	7	أورلال	Ourlal	Ourlal
627	7	بسكرة	Biskra	Biskra
628	7	فوغالة	Foughala	Foughala
629	7	سيدي عقبة	Sidi Okba	Sidi Okba
630	7	مشونش	Mechouneche	Mechouneche
631	8	بشار	Bechar	Bechar
632	8	لحمر	Lahmar	Lahmar
633	8	القنادسة	Kenadsa	Kenadsa
634	8	تاغيت	Taghit	Taghit
635	8	العبادلة	Abadla	Abadla
636	8	بني ونيف	Beni Ounif	Beni Ounif
637	8	تبلبالة	Tabelbala	Tabelbala
638	9	أولاد يعيش	Ouled Yaich	Ouled Yaich
639	9	بوقرة	Bougara	Bougara
640	9	موزاية	Mouzaia	Mouzaia
641	9	الأربعاء	Larbaa	Larbaa
642	9	بوفاريك	Boufarik	Boufarik
643	9	مفتاح	Meftah	Meftah
644	9	العفرون	El Affroun	El Affroun
645	9	وادي العلايق	Oued El Alleug	Oued El Alleug
646	9	بوعينان	Bouinan	Bouinan
647	9	البليدة	Blida	Blida
648	10	عين بسام	Ain Bessem	Ain Bessem
649	10	برج أوخريص	Bordj Okhriss	Bordj Okhriss
650	10	سور الغزلان	Sour El Ghozlane	Sour El Ghozlane
651	10	بشلول	Bechloul	Bechloul
652	10	مشد الله	M'chedallah	M'chedallah
653	10	بئر غبالو	Bir Ghbalou	Bir Ghbalou
654	10	البويرة	Bouira	Bouira
655	10	سوق الخميس	Souk El Khemis	Souk El Khemis
656	10	القادرية	Kadiria	Kadiria
657	10	الهاشمية	El Hachimia	El Hachimia
658	10	الحيزر	Haizer	Haizer
659	10	الأخضرية	Lakhdaria	Lakhdaria
660	11	تاظروك	Tazrouk	Tazrouk
661	11	سيلت	Silet	Silet
662	11	تمنراست	Tamanrasset	Tamanrasset
663	12	الماء الابيض	El Malabiod	El Malabiod
664	12	العوينات	El Aouinet	El Aouinet
665	12	بئر مقدم	Bir Mokadem	Bir Mokadem
666	12	مرسط	Morsott	Morsott
667	12	أم علي	Oum Ali	Oum Ali
668	12	الكويف	El Kouif	El Kouif
669	12	الونزة	Ouenza	Ouenza
670	12	العقلة	El Ogla	El Ogla
671	12	الشريعة	Cheria	Cheria
672	12	تبسة	Tebessa	Tebessa
673	13	باب العسة	Bab El Assa	Bab El Assa
674	13	منصورة	Mansourah	Mansourah
675	13	شتوان	Chetouane	Chetouane
676	13	هنين	Honnaine	Honnaine
677	13	ندرومة	Nedroma	Nedroma
678	13	مرسى بن مهيدي	Marsa Ben Mehdi	Marsa Ben Mehdi
679	13	بني بوسعيد	Beni Boussaid	Beni Boussaid
680	13	سبدو	Sebdou	Sebdou
681	13	صبرة	Sabra	Sabra
682	13	مغنية	Maghnia	Maghnia
683	13	الحناية	Hennaya	Hennaya
684	13	بن سكران	Bensekrane	Bensekrane
685	13	فلاوسن	Fellaoucene	Fellaoucene
686	13	تلمسان	Tlemcen	Tlemcen
687	13	عين تالوت	Ain Tellout	Ain Tellout
688	13	الرمشي	Remchi	Remchi
689	13	الغزوات	Ghazaouet	Ghazaouet
690	13	أولاد ميمون	Ouled Mimoun	Ouled Mimoun
691	13	بني سنوس	Beni Snous	Beni Snous
692	14	مهدية	Mahdia	Mahdia
693	14	السوقر	Sougueur	Sougueur
694	14	مغيلة	Meghila	Meghila
695	14	فرندة	Frenda	Frenda
696	14	عين كرمس	Ain Kermes	Ain Kermes
697	14	تنس	Tenes	Tenes
698	14	رحوية	Rahouia	Rahouia
699	14	وادي ليلي	Oued Lili	Oued Lili
700	14	مشرع الصفا	Mechraa Sfa	Mechraa Sfa
701	14	تيارت	Tiaret	Tiaret
702	14	مدروسة	Medroussa	Medroussa
703	14	عين الذهب	Ain Deheb	Ain Deheb
704	14	دحموني	Dahmouni	Dahmouni
705	15	تيقزيرت	Tigzirt	Tigzirt
706	15	بوزقن	Bouzeguene	Bouzeguene
707	15	بني دوالة	Beni Douala	Beni Douala
708	15	واضية	Ouadhias	Ouadhias
709	15	أزفون	Azeffoun	Azeffoun
710	15	بوغني	Boghni	Boghni
711	15	ذراع بن خدة	Draa Ben Khedda	Draa Ben Khedda
712	15	واسيف	Ouacif	Ouacif
713	15	مقلع	Mekla	Mekla
714	15	بني يني	Benni Yenni	Benni Yenni
715	15	تيزي وزو	Tizi Ouzou	Tizi Ouzou
716	15	عين الحمام	Ain El Hammam	Ain El Hammam
717	15	ماكودة	Makouda	Makouda
718	15	ذراع الميزان	Draa El Mizan	Draa El Mizan
719	15	تيزي غنيف	Tizi-Ghenif	Tizi-Ghenif
720	15	إفرحونان	Iferhounene	Iferhounene
721	15	عزازقة	Azazga	Azazga
722	15	الأربعاء ناث إيراثن	Larbaa Nath Iraten	Larbaa Nath Iraten
723	15	تيزي راشد	Tizi Rached	Tizi Rached
724	15	واقنون	Ouaguenoun	Ouaguenoun
725	15	معاتقة	Maatkas	Maatkas
726	16	حسين داي	Hussein Dey	Hussein Dey
727	16	براقي	Baraki	Baraki
728	16	الدار البيضاء	Dar El Beida	Dar El Beida
729	16	المرسى	El Marsa	El Marsa
730	16	بئر توتة	Birtouta	Birtouta
731	16	الرويبة	Rouiba	Rouiba
732	16	زرالدة	Zeralda	Zeralda
733	16	الدرارية	Draria	Draria
734	16	الشراقة	Cheraga	Cheraga
735	16	بئر مقدم	Bir Mokadem	Bir Mokadem
736	16	سيدي امحمد	Sidi M'hamed	Sidi M'hamed
737	16	بئر مراد رايس	Bir Mourad Rais	Bir Mourad Rais
738	16	باب الوادي	Bab El Oued	Bab El Oued
739	16	بوزريعة	Bouzareah	Bouzareah
740	16	الحراش	El Harrach	El Harrach
741	17	حاسي بحبح	Hassi Bahbah	Hassi Bahbah
742	17	عين الإبل	Ain El Ibel	Ain El Ibel
743	17	الشارف	Charef	Charef
744	17	دار الشيوخ	Dar Chioukh	Dar Chioukh
745	17	الادريسية	El Idrissia	El Idrissia
746	17	الجلفة	Djelfa	Djelfa
747	18	جيجل	Jijel	Jijel
748	18	العوانة	El Aouana	El Aouana
749	18	زيامة منصورية	Ziamah Mansouriah	Ziamah Mansouriah
750	18	الطاهير	Taher	Taher
751	18	الشقفة	Chekfa	Chekfa
752	18	الميلية	El Milia	El Milia
753	18	سيدي معروف	Sidi Marouf	Sidi Marouf
754	18	السطارة	Settara	Settara
755	18	العنصر	El Ancer	El Ancer
756	18	جيملة	Djimla	Djimla
757	18	تاكسنة	Texenna	Texenna
758	19	صالح باي	Salah Bey	Salah Bey
759	19	عموشة	Amoucha	Amoucha
760	19	عين أرنات	Ain Arnat	Ain Arnat
761	19	عين ولمان	Ain Oulmene	Ain Oulmene
762	19	بوعنداس	Bouandas	Bouandas
763	19	حمام السخنة	Hammam Sokhna	Hammam Sokhna
764	19	عين أزال	Ain Azel	Ain Azel
765	19	قنزات	Guenzet	Guenzet
766	19	بوقاعة	Bougaa	Bougaa
767	19	حمام قرقور	Hammam Guergour	Hammam Guergour
768	19	سطيف	Setif	Setif
769	19	عين الكبيرة	Ain El Kebira	Ain El Kebira
770	19	بني عزيز	Beni Aziz	Beni Aziz
771	19	بئر العرش	Bir El Arch	Bir El Arch
772	19	ماوكلان	Maoklane	Maoklane
773	19	بابور	Babor	Babor
774	19	قجال	Guidjel	Guidjel
775	19	العلمة	El Eulma	El Eulma
776	19	جميلة	Djemila	Djemila
777	19	بني ورتيلان	Beni Ourtilane	Beni Ourtilane
778	20	سعيدة	Saida	Saida
779	20	أولاد ابراهيم	Ouled Brahim	Ouled Brahim
780	20	سور الغزلان	Sour El Ghozlane	Sour El Ghozlane
781	20	الحساسنة	El Hassasna	El Hassasna
782	20	سيدي بوبكر	Sidi Boubekeur	Sidi Boubekeur
783	20	يوب	Youb	Youb
784	20	عين الحجر	Ain El Hadjar	Ain El Hadjar
785	20	عين بسام	Ain Bessem	Ain Bessem
786	21	سيدي مزغيش	Sidi Mezghiche	Sidi Mezghiche
787	21	الحروش	El Harrouch	El Harrouch
788	21	الحدائق	El Hadaiek	El Hadaiek
789	21	رمضان جمال	Ramdane Djamel	Ramdane Djamel
790	21	تمالوس	Tamalous	Tamalous
791	21	عين قشرة	Ain Kechra	Ain Kechra
792	21	أم الطوب	Oum Toub	Oum Toub
793	21	عزابة	Azzaba	Azzaba
794	21	الزيتونة	Zitouna	Zitouna
795	21	أولاد عطية	Ouled Attia	Ouled Attia
796	21	القل	Collo	Collo
797	21	المرسى	El Marsa	El Marsa
798	21	بن عزوز	Ben Azzouz	Ben Azzouz
799	21	سكيكدة	Skikda	Skikda
800	22	سيدي علي بن يوب	Sidi Ali Ben Youb	Sidi Ali Ben Youb
801	22	مولاي سليسن	Moulay Slissen	Moulay Slissen
802	22	تنيرة	Tenira	Tenira
803	22	مرين	Merine	Merine
804	22	سيدي لحسن	Sidi Lahcene	Sidi Lahcene
805	22	عين البرد	Ain El Berd	Ain El Berd
806	22	بن باديس	Ben Badis	Ben Badis
807	22	سفيزف	Sfisef	Sfisef
808	22	مرحوم	Marhoum	Marhoum
809	22	راس الماء	Ras El Ma	Ras El Ma
810	22	سيدي بلعباس	Sidi Bel Abbes	Sidi Bel Abbes
811	22	تسالة	Tessala	Tessala
812	22	مصطفى بن ابراهيم	Mostefa  Ben Brahim	Mostefa  Ben Brahim
813	22	تلاغ	Telagh	Telagh
814	22	سيدي علي بوسيدي	Sidi Ali Boussidi	Sidi Ali Boussidi
815	23	عنابة	Annaba	Annaba
816	23	برحال	Berrahal	Berrahal
817	23	الحجار	El Hadjar	El Hadjar
818	23	البوني	El Bouni	El Bouni
819	23	عين الباردة	Ain El Berda	Ain El Berda
820	23	العلمة	El Eulma	El Eulma
821	23	شطايبي	Chetaibi	Chetaibi
822	24	قلعة بوصبع	Guelaat Bousbaa	Guelaat Bousbaa
823	24	حمام دباغ	Hammam Debagh	Hammam Debagh
824	24	حمام النبايل	Hammam N'bails	Hammam N'bails
825	24	قالمة	Guelma	Guelma
826	24	بوشقوف	Bouchegouf	Bouchegouf
827	24	هيليوبوليس	Heliopolis	Heliopolis
828	24	عين حساينية	Ain Hessainia	Ain Hessainia
829	24	وادي الزناتي	Oued Zenati	Oued Zenati
830	24	عين مخلوف	Ain Makhlouf	Ain Makhlouf
831	24	خزارة	Khezaras	Khezaras
832	25	حامة بوزيان	Hamma Bouziane	Hamma Bouziane
833	25	زيغود يوسف	Zighoud Youcef	Zighoud Youcef
834	25	الخروب	El Khroub	El Khroub
835	25	عين عبيد	Ain Abid	Ain Abid
836	25	ابن زياد	Ibn Ziad	Ibn Ziad
837	25	قسنطينة	Constantine	Constantine
838	26	السواقي	Souaghi	Souaghi
839	26	العزيزية	El Azizia	El Azizia
840	26	عوامري	Ouamri	Ouamri
841	26	بني سليمان	Beni Slimane	Beni Slimane
842	26	سي المحجوب	Si Mahdjoub	Si Mahdjoub
843	26	البرواقية	Berrouaghia	Berrouaghia
844	26	سغوان	Seghouane	Seghouane
845	26	تابلاط	Tablat	Tablat
846	26	المدية	Medea	Medea
847	26	وزرة	Ouzera	Ouzera
848	26	العمارية	El Omaria	El Omaria
849	26	أولاد ابراهيم	Ouled Brahim	Ouled Brahim
850	26	القلب الكبير	Guelb El Kebir	Guelb El Kebir
851	26	سيدي نعمان	Sidi Naamane	Sidi Naamane
852	27	عين نويسي	Ain Nouicy	Ain Nouicy
853	27	عين تادلس	Ain Tedeles	Ain Tedeles
854	27	حاسي ماماش	Hassi Mameche	Hassi Mameche
855	27	خير الدين	Kheir Eddine	Kheir Eddine
856	27	سيدي علي	Sidi Ali	Sidi Ali
857	27	سيدي لخضر	Sidi Lakhdar	Sidi Lakhdar
858	27	مستغانم	Mostaganem	Mostaganem
859	27	عشعاشة	Achaacha	Achaacha
860	27	بوقيراط	Bouguirat	Bouguirat
861	27	ماسرة	Mesra	Mesra
862	27	منصورة	Mansourah	Mansourah
863	28	شلال	Chellal	Chellal
864	28	مقرة	Magra	Magra
865	28	سيدي عيسى	Sidi Aissa	Sidi Aissa
866	28	عين الحجل	Ain El Hadjel	Ain El Hadjel
867	28	جبل مساعد	Djebel Messaad	Djebel Messaad
868	28	المسيلة	M'sila	M'sila
869	28	حمام الضلعة	Hammam Dalaa	Hammam Dalaa
870	28	أولاد دراج	Ouled Derradj	Ouled Derradj
871	28	خبانة	Khoubana	Khoubana
872	29	وادي الأبطال	Oued El Abtal	Oued El Abtal
873	29	المحمدية	Mohammadia	Mohammadia
874	29	الدار البيضاء	Dar El Beida	Dar El Beida
875	29	تيغنيف	Tighennif	Tighennif
876	29	زهانة	Zahana	Zahana
877	29	عقاز	Oggaz	Oggaz
878	29	سيق	Sig	Sig
879	29	عين فارس	Ain Fares	Ain Fares
880	29	بوحنيفية	Bouhanifia	Bouhanifia
881	29	عين الملح	Ain El Melh	Ain El Melh
882	29	عوف	Aouf	Aouf
883	29	وادي التاغية	Oued Taria	Oued Taria
884	29	عين فكان	Ain Fekan	Ain Fekan
885	29	البرج	El Bordj	El Bordj
886	29	غريس	Ghriss	Ghriss
887	29	معسكر	Mascara	Mascara
888	29	تيزي	Tizi	Tizi
889	29	الحشم	Hachem	Hachem
890	30	ورقلة	Ouargla	Ouargla
891	30	حاسي مسعود	Hassi Messaoud	Hassi Messaoud
892	30	عين البيضاء	Ain Beida	Ain Beida
893	30	سيدي خويلد	Sidi Khouiled	Sidi Khouiled
894	30	البرمة	El Borma	El Borma
895	30	انقوسة	N'goussa	N'goussa
896	31	السانية	Es Senia	Es Senia
897	31	قديل	Gdyel	Gdyel
898	31	بئر الجير	Bir El Djir	Bir El Djir
899	31	أرزيو	Arzew	Arzew
900	31	بطيوة	Bethioua	Bethioua
901	31	البويرة	Bouira	Bouira
902	31	وهران	Oran	Oran
903	31	عين الترك	Ain Turk	Ain Turk
904	31	وادي تليلات	Oued Tlelat	Oued Tlelat
905	31	بوتليليس	Boutlelis	Boutlelis
906	32	الأبيض سيدي الشيخ	Labiodh Sidi Cheikh	Labiodh Sidi Cheikh
907	32	بريزينة	Brezina	Brezina
908	32	بوعلام	Boualem	Boualem
909	32	سيدي عامر	Sidi Ameur	Sidi Ameur
910	32	بوقطب	Bougtoub	Bougtoub
911	32	البيض	El Bayadh	El Bayadh
912	32	رقاصة	Rogassa	Rogassa
913	32	شلالة	Chellala	Chellala
914	33	إن أمناس	In Amenas	In Amenas
915	33	إيليزي	Illizi	Illizi
916	34	الحمادية	El Hamadia	El Hamadia
917	34	أولاد سيدي ابراهيم	Ouled Sidi Brahim	Ouled Sidi Brahim
918	34	عين تاغروت	Ain Taghrout	Ain Taghrout
919	34	برج الغدير	Bordj Ghedir	Bordj Ghedir
920	34	بئر قاصد علي	Bir Kasdali	Bir Kasdali
921	34	جعافرة	Djaafra	Djaafra
922	34	مجانة	Medjana	Medjana
923	34	المنصورة	Mansourah	Mansourah
924	34	رأس الوادي	Ras El Oued	Ras El Oued
925	34	برج زمورة	Bordj Zemmoura	Bordj Zemmoura
926	34	برج بوعريريج	Bordj Bou Arreridj	Bordj Bou Arreridj
927	35	بودواو	Boudouaou	Boudouaou
928	35	دلس	Dellys	Dellys
929	35	الثنية	Thenia	Thenia
930	35	خميس الخشنة	Khemis El Khechna	Khemis El Khechna
931	35	تيمزريت	Timezrit	Timezrit
932	35	برج منايل	Bordj Menaiel	Bordj Menaiel
933	35	يسر	Isser	Isser
934	35	الناصرية	Naciria	Naciria
935	35	بغلية	Baghlia	Baghlia
936	35	بومرداس	Boumerdes	Boumerdes
937	36	الطارف	El Tarf	El Tarf
938	36	الزيتونة	Zitouna	Zitouna
939	36	البسباس	Besbes	Besbes
940	36	بوتليليس	Boutlelis	Boutlelis
941	36	بوحجار	Bouhadjar	Bouhadjar
942	36	بن مهيدي	Ben M'hidi	Ben M'hidi
943	36	الذرعان	Drean	Drean
944	36	القالة	El Kala	El Kala
945	36	بوثلجة	Bouteldja	Bouteldja
946	37	تندوف	Tindouf	Tindouf
947	38	خميستي	Khemisti	Khemisti
948	38	ثنية الاحد	Theniet El Had	Theniet El Had
949	38	تيسمسيلت	Tissemsilt	Tissemsilt
950	38	لرجام	Lardjem	Lardjem
951	38	برج بونعامة	Bordj Bounaama	Bordj Bounaama
952	38	عماري	Ammari	Ammari
953	38	بوعلام	Boualem	Boualem
954	38	الأزهرية	Lazharia	Lazharia
955	38	الأربعاء	Larbaa	Larbaa
956	38	برج الأمير عبد القادر	Bordj Emir Abdelkader	Bordj Emir Abdelkader
957	39	الطالب العربي	Taleb Larbi	Taleb Larbi
958	39	العقلة	El Ogla	El Ogla
959	39	المقرن	Magrane	Magrane
960	39	اميه وانسة	Mih Ouensa	Mih Ouensa
961	39	الوادي	El Oued	El Oued
962	39	البياضة	Bayadha	Bayadha
963	39	الرباح	Robbah	Robbah
964	39	قمار	Guemar	Guemar
965	39	الرقيبة	Reguiba	Reguiba
966	39	الدبيلة	Debila	Debila
967	39	حاسي خليفة	Hassi Khalifa	Hassi Khalifa
968	40	ششار	Chechar	Chechar
969	40	بابار	Babar	Babar
970	40	أولاد رشاش	Ouled Rechache	Ouled Rechache
971	40	بوحمامة	Bouhmama	Bouhmama
972	40	خنشلة	Khenchela	Khenchela
973	40	قايس	Kais	Kais
974	40	الحامة	El Hamma	El Hamma
975	40	عين الطويلة	Ain Touila	Ain Touila
976	41	سوق أهراس	Souk Ahras	Souk Ahras
977	41	سدراتة	Sedrata	Sedrata
978	41	المشروحة	Mechroha	Mechroha
979	41	أولاد إدريس	Ouled Driss	Ouled Driss
980	41	أم العظايم	Oum El Adhaim	Oum El Adhaim
981	41	مداوروش	M'daourouche	M'daourouche
982	41	تاورة	Taoura	Taoura
983	41	الحدادة	Haddada	Haddada
984	41	المراهنة	Merahna	Merahna
985	41	بئر بوحوش	Bir Bouhouche	Bir Bouhouche
986	42	حجوط	Hadjout	Hadjout
987	42	سيدي أعمر	Sidi Amar	Sidi Amar
988	42	قوراية	Gouraya	Gouraya
989	42	شرشال	Cherchell	Cherchell
990	42	الداموس	Damous	Damous
991	42	فوكة	Fouka	Fouka
992	42	بواسماعيل	Bou Ismail	Bou Ismail
993	42	خميستي	Khemisti	Khemisti
994	42	أحمر العين	Ahmar El Ain	Ahmar El Ain
995	42	القليعة	Kolea	Kolea
996	42	تيبازة	Tipaza	Tipaza
997	43	التلاغمة	Teleghma	Teleghma
998	43	عين البيضاء أحريش	Ain Beida Harriche	Ain Beida Harriche
999	43	ترعي باينان	Terrai Bainen	Terrai Bainen
1000	43	تسدان حدادة	Tassadane Haddada	Tassadane Haddada
1001	43	سيدي مروان	Sidi Merouane	Sidi Merouane
1002	43	القرارم قوقة	Grarem Gouga	Grarem Gouga
1003	43	الرواشد	Rouached	Rouached
1004	43	بوحاتم	Bouhatem	Bouhatem
1005	43	وادي النجاء	Oued Endja	Oued Endja
1006	43	تاجنانت	Tadjenanet	Tadjenanet
1007	43	شلغوم العيد	Chelghoum Laid	Chelghoum Laid
1008	43	ميلة	Mila	Mila
1009	43	فرجيوة	Ferdjioua	Ferdjioua
1010	44	خميس	Khemis	Khemis
1011	44	حمام ريغة	Hammam Righa	Hammam Righa
1012	44	جليدة	Djelida	Djelida
1013	44	بومدفع	Boumedfaa	Boumedfaa
1014	44	العامرة	El Amra	El Amra
1015	44	العطاف	El Attaf	El Attaf
1016	44	العبادية	El Abadia	El Abadia
1017	44	جندل	Djendel	Djendel
1018	44	مليانة	Miliana	Miliana
1019	44	عين الاشياخ	Ain Lechiakh	Ain Lechiakh
1020	44	أولاد ابراهيم	Ouled Brahim	Ouled Brahim
1021	44	الروينة	Rouina	Rouina
1022	44	برج الأمير خالد	Bordj El Emir Khaled	Bordj El Emir Khaled
1023	44	بطحية	Bathia	Bathia
1024	44	عين الدفلى	Ain Defla	Ain Defla
1025	45	عين الصفراء	Ain Sefra	Ain Sefra
1026	45	مغرار	Moghrar	Moghrar
1027	45	عسلة	Asla	Asla
1028	45	مكمن بن عمار	Mekmen Ben Amar	Mekmen Ben Amar
1029	45	المشرية	Mecheria	Mecheria
1030	45	النعامة	Naama	Naama
1031	45	سفيسيفة	Sfissifa	Sfissifa
1032	46	عين الأربعاء	Ain Larbaa	Ain Larbaa
1033	46	المالح	El Maleh	El Maleh
1034	46	حمام بوحجر	Hammam Bou Hadjar	Hammam Bou Hadjar
1035	46	العامرية	El Amria	El Amria
1036	46	عين الكيحل	Ain Kihel	Ain Kihel
1037	46	بني صاف	Beni Saf	Beni Saf
1038	46	الطاهير	Taher	Taher
1039	46	ولهاصة الغرابة	Oulhassa Gheraba	Oulhassa Gheraba
1040	46	عين تموشنت	Ain Temouchent	Ain Temouchent
1041	47	ضاية بن ضحوة	Dhayet Ben Dhahoua	Dhayet Ben Dhahoua
1042	47	المنصورة	Mansourah	Mansourah
1043	47	بونورة	Bounoura	Bounoura
1044	47	زلفانة	Zelfana	Zelfana
1045	47	القرارة	El Guerrara	El Guerrara
1046	47	متليلي	Metlili	Metlili
1047	47	بريان	Berriane	Berriane
1048	47	غرداية	Ghardaia	Ghardaia
1049	48	مازونة	Mazouna	Mazouna
1050	48	عمي موسى	Ammi Moussa	Ammi Moussa
1051	48	زمورة	Zemmoura	Zemmoura
1052	48	جديوية	Djidiouia	Djidiouia
1053	48	المطمر	El Matmar	El Matmar
1054	48	عين طارق	Ain Tarek	Ain Tarek
1055	48	بئر العرش	Bir El Arch	Bir El Arch
1056	48	يلل	Yellel	Yellel
1057	48	الثنية	Thenia	Thenia
1058	48	منداس	Mendes	Mendes
1059	48	وادي رهيو	Oued Rhiou	Oued Rhiou
1060	48	غليزان	Relizane	Relizane
1061	48	عين جاسر	Ain Djasser	Ain Djasser
1062	48	سيدي أمحمد بن علي	Sidi M'hamed Ben Ali	Sidi M'hamed Ben Ali
1063	48	الحمادنة	El H'madna	El H'madna
1064	48	الرمكة	Ramka	Ramka
1065	49	تنركوك	Tinerkouk	Tinerkouk
1066	49	تيميمون	Timimoun	Timimoun
1067	49	أوقروت	Aougrout	Aougrout
1068	49	شروين	Charouine	Charouine
1069	49	الناصرية	Naciria	Naciria
1070	49	مسعد	Messaad	Messaad
1071	50	برج باجي مختار	Bordj Badji Mokhtar	Bordj Badji Mokhtar
1072	51	سيدي  خالد	Sidi Khaled	Sidi Khaled
1073	51	سيدي لحسن	Sidi Lahcene	Sidi Lahcene
1074	51	أولاد جلال	Ouled Djellal	Ouled Djellal
1075	51	القليعة	Kolea	Kolea
1076	52	بني عباس	Beni Abbes	Beni Abbes
1077	52	إقلي	Igli	Igli
1078	52	الواتة	El Ouata	El Ouata
1079	52	أولاد خضير	Ouled Khodeir	Ouled Khodeir
1080	52	كرزاز	Kerzaz	Kerzaz
1081	53	إينغر	In Ghar	In Ghar
1082	53	عين صالح	In Salah	In Salah
1083	54	تين زواتين	Tin Zouatine	Tin Zouatine
1084	54	عين قزام	In Guezzam	In Guezzam
1085	55	تماسين	Temacine	Temacine
1086	55	بوعلام	Boualem	Boualem
1087	55	المقارين	Megarine	Megarine
1088	55	تقرت	Touggourt	Touggourt
1089	55	الطيبات	Taibet	Taibet
1090	55	الحجيرة	El-Hadjira	El-Hadjira
1091	56	جانت	Djanet	Djanet
1092	57	المغير	El Meghaier	El Meghaier
1093	57	جامعة	Djamaa	Djamaa
1094	58	المنيعة	El Menia	El Menia
1095	58	المنصورة	Mansourah	Mansourah
1096	59	قتلة سيدي سعيد	Gueltat Sidi Saad	Gueltat Sidi Saad
1097	59	بريدة	Brida	Brida
1098	59	الغيشة	El Ghicha	El Ghicha
1099	59	أفلو	Aflou	Aflou
1100	59	وادي مرة	Oued Morra	Oued Morra
1101	60	بريزينة	Brezina	Brezina
1102	60	الأبيض سيدي الشيخ	Labiodh Sidi Cheikh	Labiodh Sidi Cheikh
1103	60	بوسمغون	Boussemghoun	Boussemghoun
1104	60	رقاصة	Rogassa	Rogassa
1105	60	شلالة	Chellala	Chellala
1106	61	سيدي الجيلالي	Sidi Djillali	Sidi Djillali
1107	61	سبدو	Sebdou	Sebdou
1108	62	جمورة	Djemorah	Djemorah
1109	62	الوطاية	El Outaya	El Outaya
1110	62	القنطرة	El Kantara	El Kantara
1111	63	سقانة	Seggana	Seggana
1112	63	بريكة	Barika	Barika
1113	63	الجزار	Djezzar	Djezzar
1114	64	عين الحجل	Ain El Hadjel	Ain El Hadjel
1115	64	بوسعادة	Bousaada	Bousaada
1116	64	أولاد سيدي ابراهيم	Ouled Sidi Brahim	Ouled Sidi Brahim
1117	64	سيدي عامر	Sidi Ameur	Sidi Ameur
1118	64	بن سرور	Ben Srour	Ben Srour
1119	64	عين الملح	Ain El Melh	Ain El Melh
1120	64	سيدي امحمد	Sidi M'hamed	Sidi M'hamed
1121	64	امجدل	Medjedel	Medjedel
1122	64	جبل مساعد	Djebel Messaad	Djebel Messaad
1123	64	أولاد دراج	Ouled Derradj	Ouled Derradj
1124	64	شلال	Chellal	Chellal
1125	65	نقرين	Negrine	Negrine
1126	65	بئر العاتر	Bir El Ater	Bir El Ater
1127	66	أولاد عنتر	Ouled Antar	Ouled Antar
1128	66	قصر البخاري	Ksar El Boukhari	Ksar El Boukhari
1129	66	الشهبونية	Chahbounia	Chahbounia
1130	66	عين بوسيف	Ain Boucif	Ain Boucif
1131	66	شلالة العذاورة	Chellalat El Adhaoura	Chellalat El Adhaoura
1132	66	عزيز	Aziz	Aziz
1133	67	قصر الشلالة	Ksar Chellala	Ksar Chellala
1134	67	بوقرة	Bougara	Bougara
1135	67	حمادية	Hamadia	Hamadia
1136	68	حد الصحاري	Had Sahary	Had Sahary
1137	68	سيدي لعجال	Sidi Laadjel	Sidi Laadjel
1138	68	بيرين	Birine	Birine
1139	68	عين وسارة	Ain Oussera	Ain Oussera
1140	69	مسعد	Messaad	Messaad
1141	69	فيض البطمة	Faidh El Botma	Faidh El Botma
\.


--
-- Data for Name: commune; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."commune" ("id", "daira_id", "wilaya_id", "nom_ar", "nom_fr", "nom_en", "code_postal") FROM stdin;
1446	551	1	تيمقتن	Timekten	Timekten	01041
1447	551	1	تيت	Tit	Tit	01031
1448	551	1	اقبلي	Akabli	Akabli	01044
1449	551	1	أولف	Aoulef	Aoulef	01003
1450	552	1	بودة	Bouda	Bouda	01023
1451	552	1	أولاد أحمد تيمي	Ouled Ahmed Timmi	Ouled Ahmed Timmi	01025
1452	552	1	أدرار	Adrar	Adrar	01000
1453	553	1	فنوغيل	Fenoughil	Fenoughil	01008
1454	553	1	تامست	Tamest	Tamest	01020
1455	553	1	تامنطيط	Tamantit	Tamantit	01021
1456	554	1	إن زغمير	In Zghmir	In Zghmir	01047
1457	554	1	زاوية كنتة	Zaouiet Kounta	Zaouiet Kounta	01007
1458	555	1	رقان	Reggane	Reggane	01004
1459	555	1	سالي	Sali	Sali	01009
1460	556	1	السبع	Sebaa	Sebaa	01022
1461	556	1	تسابيت	Tsabit	Tsabit	01011
1462	557	2	تلعصة	Talassa	Talassa	02065
1463	557	2	تاجنة	Tadjena	Tadjena	02043
1464	557	2	أبو الحسن	Abou El Hassane	Abou El Hassane	02018
1465	558	2	الزبوجة	Zeboudja	Zeboudja	02014
1466	558	2	بوزغاية	Bouzeghaia	Bouzeghaia	02019
1467	558	2	بنايرية	Benairia	Benairia	02039
1468	559	2	الحجاج	El Hadjadj	El Hadjadj	02050
1469	559	2	أولاد بن عبد القادر	Ouled Ben Abdelkader	Ouled Ben Abdelkader	02037
1470	560	2	عين مران	Ain Merane	Ain Merane	02004
1471	560	2	الهرانفة	Herenfa	Herenfa	02038
1472	561	2	بريرة	Breira	Breira	02070
1473	561	2	بني حواء	Beni Haoua	Beni Haoua	02017
1474	561	2	وادي قوسين	Oued Goussine	Oued Goussine	02061
1475	562	2	أولاد عباس	Ouled Abbes	Ouled Abbes	02029
1476	562	2	وادي الفضة	Oued Fodda	Oued Fodda	02001
1477	562	2	بني راشد	Beni Rached	Beni Rached	02035
1478	563	2	المرسى	El Marsa	El Marsa	02015
1479	563	2	مصدق	Moussadek	Moussadek	02060
1480	564	2	الشلف	Chlef	Chlef	02000
1481	564	2	أم الدروع	Oum Drou	Oum Drou	02024
1482	564	2	سنجاس	Sendjas	Sendjas	02025
1483	565	2	سيدي عبد الرحمن	Sidi Abderrahmane	Sidi Abderrahmane	02066
1484	565	2	سيدي عكاشة	Sidi Akkacha	Sidi Akkacha	02009
1485	565	2	تنس	Tenes	Tenes	02006
1486	566	2	بني بوعتاب	Beni  Bouattab	Beni  Bouattab	02071
1487	566	2	الكريمية	El Karimia	El Karimia	02008
1488	566	2	حرشون	Harchoun	Harchoun	02031
1489	567	2	تاوقريت	Taougrit	Taougrit	02012
1490	567	2	الظهرة	Dahra	Dahra	02032
1491	568	2	الشطية	Chettia	Chettia	02007
1492	568	2	أولاد فارس	Ouled Fares	Ouled Fares	02010
1493	568	2	الأبيض مجاجة	Labiod Medjadja	Labiod Medjadja	02073
1494	569	2	بوقادير	Boukadir	Boukadir	02002
1495	569	2	وادي سلي	Oued Sly	Oued Sly	02011
1496	569	2	الصبحة	Sobha	Sobha	02030
1497	570	3	تاجموت	Tadjemout	Tadjemout	03007
1498	570	3	تاجرونة	Tadjrouna	Tadjrouna	03011
1499	570	3	عين ماضي	Ain Madhi	Ain Madhi	03012
1500	570	3	الحويطة	El Haouaita	El Haouaita	03040
1501	570	3	الخنق	Kheneg	Kheneg	03010
1502	571	3	الأغواط	Laghouat	Laghouat	03000
1503	572	3	قصر الحيران	Ksar El Hirane	Ksar El Hirane	03003
1504	572	3	بن ناصر بن شهرة	Benacer Benchohra	Benacer Benchohra	03033
1505	573	3	العسافية	El Assafia	El Assafia	03014
1506	573	3	سيدي مخلوف	Sidi Makhlouf	Sidi Makhlouf	03019
1507	574	3	حاسي الدلاعة	Hassi Delaa	Hassi Delaa	03022
1508	574	3	حاسي الرمل	Hassi R'mel	Hassi R'mel	03004
1509	575	4	فكيرينة	Fkirina	Fkirina	04013
1510	575	4	وادي نيني	Oued Nini	Oued Nini	04047
1511	576	4	الفجوج بوغرارة سعودي	El Fedjoudj Boughrara Sa	El Fedjoudj Boughrara Sa	04042
1512	576	4	عين فكرون	Ain Fekroun	Ain Fekroun	04005
1513	577	4	الرحية	Rahia	Rahia	04045
1514	577	4	مسكيانة	Meskiana	Meskiana	04004
1515	577	4	البلالة	El Belala	El Belala	04044
1516	577	4	بحير الشرقي	Behir Chergui	Behir Chergui	04026
1517	578	4	قصر الصباحي	Ksar Sbahi	Ksar Sbahi	04018
1518	579	4	سوق نعمان	Souk Naamane	Souk Naamane	04010
1519	579	4	أولاد زواي	Ouled Zouai	Ouled Zouai	\N
1520	579	4	بئر الشهداء	Bir Chouhada	Bir Chouhada	04021
1521	580	4	أم البواقي	Oum El Bouaghi	Oum El Bouaghi	04000
1522	580	4	عين الزيتون	Ain Zitoun	Ain Zitoun	04023
1523	581	4	عين ببوش	Ain Babouche	Ain Babouche	04020
1524	581	4	عين الديس	Ain Diss	Ain Diss	04025
1525	582	4	عين البيضاء	Ain Beida	Ain Beida	04001
1526	582	4	بريش	Berriche	Berriche	04022
1527	582	4	الزرق	Zorg	Zorg	04024
1528	583	4	عين مليلة	Ain M'lila	Ain M'lila	04002
1529	583	4	أولاد قاسم	Ouled Gacem	Ouled Gacem	04041
1530	583	4	أولاد حملة	Ouled Hamla	Ouled Hamla	04019
1531	584	4	العامرية	El Amiria	El Amiria	04038
1532	584	4	سيقوس	Sigus	Sigus	04011
1533	585	4	الضلعة	Dhalaa	Dhalaa	04008
1534	585	4	الجازية	El Djazia	El Djazia	04040
1535	586	4	عين كرشة	Ain Kercha	Ain Kercha	04006
1536	586	4	الحرملية	El Harmilia	El Harmilia	04032
1537	586	4	هنشير تومغني	Hanchir Toumghani	Hanchir Toumghani	04012
1538	587	5	معافة	Maafa	Maafa	05123
1539	587	5	عين التوتة	Ain Touta	Ain Touta	05002
1540	587	5	بني فضالة الحقانية	Beni Foudhala El Hakania	Beni Foudhala El Hakania	05141
1541	587	5	أولاد عوف	Ouled Aouf	Ouled Aouf	05122
1542	588	5	القصبات	Gosbat	Gosbat	05090
1543	588	5	تالخمت	Talkhamt	Talkhamt	\N
1544	588	5	رأس العيون	Ras El Aioun	Ras El Aioun	05009
1545	588	5	الرحبات	Rahbat	Rahbat	05091
1546	588	5	أولاد سلام	Ouled Sellem	Ouled Sellem	05044
1547	588	5	القيقبة	Guigba	Guigba	05067
1548	589	5	تيمقاد	Timgad	Timgad	05023
1549	589	5	أولاد فاضل	Ouled Fadel	Ouled Fadel	05063
1550	590	5	تاكسلانت	Taxlent	Taxlent	05055
1551	590	5	أولاد سي سليمان	Ouled Si Slimane	Ouled Si Slimane	05066
1552	590	5	لمسان	Lemcene	Lemcene	\N
1553	591	5	ثنية العابد	Teniet El Abed	Teniet El Abed	05035
1554	591	5	شير	Chir	Chir	05038
1555	591	5	وادي الطاقة	Oued Taga	Oued Taga	05036
1556	592	5	باتنة	Batna	Batna	05000
1557	592	5	فسديس	Fesdis	Fesdis	05077
1558	592	5	وادي الشعبة	Oued Chaaba	Oued Chaaba	05054
1559	593	5	حيدوسة	Hidoussa	Hidoussa	05033
1560	593	5	قصر بلزمة	Ksar Bellezma	Ksar Bellezma	05047
1561	593	5	مروانة	Merouana	Merouana	05013
1562	593	5	وادي الماء	Oued El Ma	Oued El Ma	05016
1563	594	5	لازرو	Lazrou	Lazrou	05117
1564	594	5	سريانة	Seriana	Seriana	05025
1565	594	5	زانة البيضاء	Zanet El Beida	Zanet El Beida	05071
1566	595	5	منعة	Menaa	Menaa	05012
1567	595	5	تغرغار	Tigharghar	Tigharghar	05059
1568	596	5	عين ياقوت	Ain Yagout	Ain Yagout	05031
1569	596	5	بومية	Boumia	Boumia	05104
1570	596	5	جرمة	Djerma	Djerma	05105
1571	596	5	المعذر	El Madher	El Madher	05015
1572	597	5	عيون العصافير	Ouyoun El Assafir	Ouyoun El Assafir	05069
1573	597	5	تازولت	Tazoult	Tazoult	05011
1574	598	5	بومقر	Boumagueur	Boumagueur	05057
1575	598	5	نقاوس	N Gaous	N Gaous	05004
1576	598	5	سفيان	Sefiane	Sefiane	05064
1577	599	5	أريس	Arris	Arris	05007
1578	599	5	تيغانمين	Tighanimine	Tighanimine	05060
1579	600	5	عين جاسر	Ain Djasser	Ain Djasser	05032
1580	600	5	الحاسي	El Hassi	El Hassi	05116
1581	601	5	فم الطوب	Foum Toub	Foum Toub	05049
1582	601	5	إشمول	Ichemoul	Ichemoul	05026
1583	601	5	إينوغيسن	Inoughissen	Inoughissen	05083
1584	602	5	بوزينة	Bouzina	Bouzina	05041
1585	602	5	لارباع	Larbaa	Larbaa	09002
1586	603	5	بولهيلات	Boulhilat	Boulhilat	05062
1587	603	5	الشمرة	Chemora	Chemora	05039
1588	604	5	غسيرة	Ghassira	Ghassira	05043
1589	604	5	كيمل	Kimmel	Kimmel	05079
1590	604	5	تكوت	T Kout	T Kout	05020
1591	605	6	سيدي عياد	Sidi Ayad	Sidi Ayad	06085
1592	605	6	الفلاي	Leflaye	Leflaye	06043
1593	605	6	سيدي عيش	Sidi-Aich	Sidi-Aich	06005
1594	605	6	تيفرة	Tifra	Tifra	06028
1595	605	6	تينبدار	Tinebdar	Tinebdar	06037
1596	606	6	برباشة	Barbacha	Barbacha	06009
1597	606	6	كنديرة	Kendira	Kendira	06032
1598	607	6	القصر	El Kseur	El Kseur	06003
1599	607	6	فناية الماثن	Fenaia Il Maten	Fenaia Il Maten	06041
1600	607	6	توجة	Toudja	Toudja	06030
1601	608	6	ذراع القايد	Dra El Caid	Dra El Caid	06070
1602	608	6	خراطة	Kherrata	Kherrata	06004
1603	609	6	بجاية	Bejaia	Bejaia	06000
1604	609	6	وادي غير	Oued Ghir	Oued Ghir	06017
1605	610	6	بني معوش	Benimaouche	Benimaouche	06024
1606	611	6	بني جليل	Beni Djellil	Beni Djellil	06067
1607	611	6	فرعون	Feraoun	Feraoun	06033
1608	611	6	سمعون	Smaoun	Smaoun	06020
1609	611	6	أميزور	Amizour	Amizour	06008
1610	612	6	تيمزريت	Timezrit	Timezrit	06019
1611	613	6	مالبو	Melbou	Melbou	06076
1612	613	6	سوق لإثنين	Souk El Tenine	Souk El Tenine	06012
1613	613	6	تامريجت	Tamridjet	Tamridjet	06077
1614	614	6	بوخليفة	Boukhelifa	Boukhelifa	06059
1615	614	6	تالة حمزة	Tala Hamza	Tala Hamza	06066
1616	614	6	تيشي	Tichy	Tichy	06023
1617	615	6	أيت رزين	Ait R'zine	Ait R'zine	06013
1618	615	6	إغيل علي	Ighil-Ali	Ighil-Ali	06014
1619	616	6	أيت إسماعيل	Ait-Smail	Ait-Smail	06044
1620	616	6	درقينة	Darguina	Darguina	06016
1621	616	6	تاسكريوت	Taskriout	Taskriout	06015
1622	617	6	أوقاس	Aokas	Aokas	06007
1623	617	6	تيزي نبربر	Tizi-N'berber	Tizi-N'berber	06058
1624	618	6	أدكار	Adekar	Adekar	06021
1625	618	6	بني كسيلة	Beni K'sila	Beni K'sila	06027
1626	618	6	تاوريرت إغيل	Taourit Ighil	Taourit Ighil	06035
1627	619	6	أقبو	Akbou	Akbou	06001
1628	619	6	شلاطة	Chellata	Chellata	06052
1629	619	6	اغرم	Ighram	Ighram	06048
1630	619	6	تامقرة	Tamokra	Tamokra	06053
1631	620	6	أمالو	Amalou	Amalou	06034
1632	620	6	بوحمزة	Bouhamza	Bouhamza	06031
1633	620	6	مسيسنة	M'cisna	M'cisna	06038
1634	620	6	صدوق	Seddouk	Seddouk	06011
1635	621	6	بني مليكش	Beni-Mallikeche	Beni-Mallikeche	06039
1636	621	6	بو جليل	Boudjellil	Boudjellil	06018
1637	621	6	تازمالت	Tazmalt	Tazmalt	06006
1638	622	6	أكفادو	Akfadou	Akfadou	06025
1639	622	6	شميني	Chemini	Chemini	06022
1640	622	6	سوق اوفلا	Souk Oufella	Souk Oufella	06036
1641	622	6	طيبان	Tibane	Tibane	06087
1642	623	6	أوزلاقن	Ouzellaguen	Ouzellaguen	06010
1643	624	7	الفيض	El Feidh	El Feidh	07026
1644	624	7	خنقة سيدي ناجي	Khenguet Sidi Nadji	Khenguet Sidi Nadji	07032
1645	624	7	زريبة الوادي	Zeribet El Oued	Zeribet El Oued	07012
1646	624	7	المزيرعة	Meziraa	Meziraa	07043
1647	625	7	ليشانة	Lichana	Lichana	07009
1648	625	7	بوشقرون	Bouchakroun	Bouchakroun	07022
1649	625	7	برج بن عزوز	Bordj Ben Azzouz	Bordj Ben Azzouz	07021
1650	625	7	طولقة	Tolga	Tolga	07003
1651	626	7	مخادمة	Mekhadma	Mekhadma	07034
1652	626	7	مليلي	M'lili	M'lili	07068
1653	626	7	أورلال	Ourlal	Ourlal	07011
1654	626	7	أوماش	Oumache	Oumache	07035
1655	626	7	ليوة	Lioua	Lioua	07033
1656	627	7	بسكرة	Biskra	Biskra	07000
1657	627	7	الحاجب	El Hadjab	El Hadjab	07037
1658	628	7	فوغالة	Foughala	Foughala	07031
1659	628	7	الغروس	El Ghrous	El Ghrous	07027
1660	629	7	عين الناقة	Ain Naga	Ain Naga	07039
1661	629	7	شتمة	Chetma	Chetma	07024
1662	629	7	الحوش	El Haouch	El Haouch	07028
1663	629	7	سيدي عقبة	Sidi Okba	Sidi Okba	07005
1664	630	7	مشونش	M'chouneche	M'chouneche	07010
1665	631	8	بشار	Bechar	Bechar	08000
1666	632	8	بوكايس	Boukais	Boukais	08034
1667	632	8	لحمر	Lahmar	Lahmar	08026
1668	632	8	موغل	Mogheul	Mogheul	08042
1669	633	8	المريجة	Meridja	Meridja	08041
1670	633	8	القنادسة	Kenadsa	Kenadsa	08011
1671	634	8	تاغيت	Taghit	Taghit	08030
1672	635	8	العبادلة	Abadla	Abadla	08003
1673	635	8	عرق فراج	Erg-Ferradj	Erg-Ferradj	08023
1674	635	8	مشرع هواري بومدين	Machraa-Houari-Boumediene	Machraa-Houari-Boumediene	08027
1675	636	8	بني ونيف	Beni-Ounif	Beni-Ounif	08010
1676	637	8	تبلبالة	Tabelbala	Tabelbala	08029
1677	638	9	بني مراد	Beni Mered	Beni Mered	09003
1678	638	9	أولاد يعيش	Ouled Yaich	Ouled Yaich	09015
1679	638	9	الشريعة	Chrea	Chrea	09027
1680	639	9	اولاد سلامة	Ouled Slama	Ouled Slama	09033
1681	639	9	حمام ملوان	Hammam Elouane	Hammam Elouane	09030
1682	639	9	بوقرة	Bougara	Bougara	09008
1683	640	9	موزاية	Mouzaia	Mouzaia	09013
1684	640	9	الشفة	Chiffa	Chiffa	09010
1685	640	9	عين الرمانة	Ain Romana	Ain Romana	09023
1686	641	9	صوحان	Souhane	Souhane	09034
1687	641	9	الأربعاء	Larbaa	Larbaa	09002
1688	642	9	الصومعة	Soumaa	Soumaa	09022
1689	642	9	قرواو	Guerrouaou	Guerrouaou	09029
1690	642	9	بوفاريك	Boufarik	Boufarik	09001
1691	643	9	مفتاح	Meftah	Meftah	09012
1692	643	9	جبابرة	Djebabra	Djebabra	09028
1693	644	9	وادي جر	Oued  Djer	Oued  Djer	09032
1694	644	9	العفرون	El-Affroun	El-Affroun	09011
1695	645	9	وادي العلايق	Oued El Alleug	Oued El Alleug	09014
1696	645	9	بن خليل	Benkhelil	Benkhelil	09025
1697	645	9	بني تامو	Beni-Tamou	Beni-Tamou	09024
1698	646	9	الشبلي	Chebli	Chebli	09009
1699	646	9	بوعينان	Bouinan	Bouinan	09020
1700	647	9	بوعرفة	Bouarfa	Bouarfa	09019
1701	647	9	البليدة	Blida	Blida	09000
1702	648	10	عين العلوي	Ain Laloui	Ain Laloui	10032
1703	648	10	عين الحجر	Ain El Hadjar	Ain El Hadjar	10031
1704	648	10	عين بسام	Ain-Bessem	Ain-Bessem	10005
1705	649	10	الحجرة الزرقاء	Hadjera Zerga	Hadjera Zerga	10065
1706	649	10	مزدور	Mezdour	Mezdour	10040
1707	649	10	تاقديت	Taguedite	Taguedite	10045
1708	649	10	برج أوخريص	Bordj Okhriss	Bordj Okhriss	10014
1709	650	10	ريدان	Ridane	Ridane	10083
1710	650	10	المعمورة	Maamora	Maamora	10071
1711	650	10	الحاكمية	El-Hakimia	El-Hakimia	10058
1712	650	10	ديرة	Dirah	Dirah	10020
1713	650	10	الدشمية	Dechmia	Dechmia	10057
1714	650	10	سور الغزلان	Sour El Ghozlane	Sour El Ghozlane	10004
1715	651	10	أهل القصر	Ahl El Ksar	Ahl El Ksar	10008
1716	651	10	بشلول	Bechloul	Bechloul	10012
1717	651	10	العجيبة	El Adjiba	El Adjiba	10021
1718	651	10	الأسنام	El Asnam	El Asnam	10022
1719	651	10	أولاد راشد	Ouled Rached	Ouled Rached	\N
1720	652	10	آث  منصور	Ath Mansour	Ath Mansour	10011
1721	652	10	سحاريج	Saharidj	Saharidj	10043
1722	652	10	أمشدالة	M Chedallah	M Chedallah	10003
1723	652	10	حنيف	Hanif	Hanif	10030
1724	652	10	شرفة	Chorfa	Chorfa	10019
1725	652	10	أغبالو	Aghbalou	Aghbalou	10007
1726	653	10	روراوة	Raouraoua	Raouraoua	10042
1727	653	10	الخبوزية	El Khabouzia	El Khabouzia	10038
1728	653	10	بئر غبالو	Bir Ghbalou	Bir Ghbalou	10013
1729	654	10	البويرة	Bouira	Bouira	10000
1730	654	10	عين الترك	Ain Turk	Ain Turk	10033
1731	654	10	أيت لعزيز	Ait Laaziz	Ait Laaziz	10034
1732	655	10	المقراني	El-Mokrani	El-Mokrani	10060
1733	655	10	سوق الخميس	Souk El Khemis	Souk El Khemis	10044
1734	656	10	أعمر	Aomar	Aomar	10010
1735	656	10	جباحية	Djebahia	Djebahia	10036
1736	656	10	قادرية	Kadiria	Kadiria	10006
1737	657	10	الهاشمية	El Hachimia	El Hachimia	10023
1738	657	10	وادي البردي	Oued El Berdi	Oued El Berdi	10075
1739	658	10	حيزر	Haizer	Haizer	10024
1740	658	10	تاغزوت	Taghzout	Taghzout	10055
1741	659	10	بودربالة	Bouderbala	Bouderbala	10016
1742	659	10	بوكرم	Boukram	Boukram	10054
1743	659	10	قرومة	Guerrouma	Guerrouma	10037
1744	659	10	الأخضرية	Lakhdaria	Lakhdaria	10002
1745	659	10	معلة	Maala	Maala	10039
1746	659	10	زبربر	Z'barbar (El Isseri )	Z'barbar (El Isseri )	10047
1747	660	11	تاظروك	Tazrouk	Tazrouk	11010
1748	660	11	أدلس	Idles	Idles	11013
1749	661	11	ابلسة	Abelsa	Abelsa	11007
1750	662	11	تمنراست	Tamanrasset	Tamanrasset	11000
1751	662	11	عين امقل	Ain Amguel	Ain Amguel	11003
1752	663	12	الحويجبات	El-Houidjbet	El-Houidjbet	12038
1753	663	12	الماء الابيض	El Malabiod	El Malabiod	12014
1754	664	12	العوينات	El-Aouinet	El-Aouinet	12005
1755	664	12	بوخضرة	Boukhadra	Boukhadra	12012
1756	665	12	بئر مقدم	Bir Mokkadem	Bir Mokkadem	12011
1757	665	12	قريقر	Guorriguer	Guorriguer	12046
1758	665	12	الحمامات	Hammamet	Hammamet	12016
1759	666	12	بئر الذهب	Bir Dheheb	Bir Dheheb	12031
1760	666	12	مرسط	Morsott	Morsott	12017
1761	667	12	صفصاف الوسرى	Saf Saf El Ouesra	Saf Saf El Ouesra	12037
1762	667	12	أم علي	Oum Ali	Oum Ali	12027
1763	668	12	بكارية	Bekkaria	Bekkaria	12019
1764	668	12	بولحاف الدير	Boulhaf Dyr	Boulhaf Dyr	12039
1765	668	12	الكويف	El Kouif	El Kouif	12006
1766	669	12	الونزة	Ouenza	Ouenza	12003
1767	669	12	المريج	El Meridj	El Meridj	12023
1768	669	12	عين الزرقاء	Ain Zerga	Ain Zerga	12008
1769	670	12	سطح قنطيس	Stah Guentis	Stah Guentis	12032
1770	670	12	العقلة	El Ogla	El Ogla	12015
1771	670	12	المزرعة	El Mezeraa	El Mezeraa	12042
1772	670	12	بجن	Bedjene	Bedjene	12035
1773	671	12	ثليجان	Telidjen	Telidjen	12053
1774	671	12	الشريعة	Cheria	Cheria	12002
1775	672	12	تبسة	Tebessa	Tebessa	12000
1776	673	13	باب العسة	Bab El Assa	Bab El Assa	13014
1777	673	13	سوق الثلاثاء	Souk Tleta	Souk Tleta	13078
1778	673	13	السواني	Souani	Souani	13046
1779	674	13	تيرني بني هديل	Terny Beni Hediel	Terny Beni Hediel	13079
1780	674	13	منصورة	Mansourah	Mansourah	13062
1781	674	13	بني مستر	Beni Mester	Beni Mester	13038
1782	674	13	عين غرابة	Ain Ghoraba	Ain Ghoraba	13023
1783	675	13	شتوان	Chetouane	Chetouane	13048
1784	675	13	عمير	Amieur	Amieur	13058
1785	675	13	عين فزة	Ain Fezza	Ain Fezza	13022
1786	676	13	هنين	Honnaine	Honnaine	13015
1787	676	13	بني خلاد	Beni Khellad	Beni Khellad	13074
1788	677	13	ندرومة	Nedroma	Nedroma	13004
1789	677	13	جبالة	Djebala	Djebala	13029
1790	678	13	مسيردة الفواقة	M'sirda Fouaga	M'sirda Fouaga	13024
1791	678	13	مرسى بن مهيدي	Marsa Ben M'hidi	Marsa Ben M'hidi	13017
1792	679	13	سيدي مجاهد	Sidi Medjahed	Sidi Medjahed	13044
1793	679	13	بني بوسعيد	Beni Boussaid	Beni Boussaid	\N
1794	680	13	سبدو	Sebdou	Sebdou	13006
1795	681	13	بوحلو	Bouhlou	Bouhlou	13026
1796	681	13	صبرة	Sabra	Sabra	13011
1797	682	13	مغنية	Maghnia	Maghnia	13001
1798	682	13	حمام بوغرارة	Hammam Boughrara	Hammam Boughrara	13036
1799	683	13	زناتة	Zenata	Zenata	13051
1800	683	13	أولاد رياح	Ouled Riyah	Ouled Riyah	13070
1801	683	13	الحناية	Hennaya	Hennaya	13009
1802	684	13	سيدي العبدلي	Sidi Abdelli	Sidi Abdelli	13019
1803	684	13	بن سكران	Bensekrane	Bensekrane	13008
1804	685	13	فلاوسن	Fellaoucene	Fellaoucene	13035
1805	685	13	عين الكبيرة	Ain Kebira	Ain Kebira	13049
1806	685	13	عين فتاح	Ain Fetah	Ain Fetah	13028
1807	686	13	تلمسان	Tlemcen	Tlemcen	13000
1808	687	13	عين النحالة	Ain Nehala	Ain Nehala	13054
1809	687	13	عين تالوت	Ain Tellout	Ain Tellout	13012
1810	688	13	عين يوسف	Ain Youcef	Ain Youcef	13013
1811	688	13	بني وارسوس	Beni Ouarsous	Beni Ouarsous	13025
1812	688	13	الفحول	El Fehoul	El Fehoul	13033
1813	688	13	الرمشي	Remchi	Remchi	13005
1814	688	13	سبعة شيوخ	Sebbaa Chioukh	Sebbaa Chioukh	13042
1815	689	13	دار يغمراسن	Dar Yaghmoracen	Dar Yaghmoracen	13032
1816	689	13	الغزوات	Ghazaouet	Ghazaouet	13002
1817	689	13	السواحلية	Souahlia	Souahlia	13020
1818	689	13	تيانت	Tianet	Tianet	13047
1819	690	13	بني صميل	Beni Smiel	Beni Smiel	13083
1820	690	13	وادي الخضر	Oued Lakhdar	Oued Lakhdar	13068
1821	690	13	أولاد ميمون	Ouled Mimoun	Ouled Mimoun	13010
1822	691	13	بني بهدل	Beni Bahdel	Beni Bahdel	13060
1823	691	13	بني سنوس	Beni Snous	Beni Snous	13037
1824	691	13	العزايل	Azail	Azail	13080
1825	692	14	مهدية	Mahdia	Mahdia	14004
1826	692	14	عين دزاريت	Ain Dzarit	Ain Dzarit	14017
1827	692	14	السبعين	Sebaine	Sebaine	14030
1828	692	14	الناظورة	Nadorah	Nadorah	14058
1829	693	14	الفايجة	Faidja	Faidja	14049
1830	693	14	سي عبد الغني	Si Abdelghani	Si Abdelghani	14027
1831	693	14	السوقر	Sougueur	Sougueur	14003
1832	693	14	توسنينة	Tousnina	Tousnina	14037
1833	694	14	مغيلة	Meghila	Meghila	14024
1834	694	14	السبت	Sebt	Sebt	21018
1835	694	14	سيدي حسني	Sidi Hosni	Sidi Hosni	14029
1836	695	14	عين الحديد	Ain El Hadid	Ain El Hadid	14008
1837	695	14	فرندة	Frenda	Frenda	14001
1838	695	14	تخمرت	Takhemaret	Takhemaret	14015
1839	696	14	عين كرمس	Ain Kermes	Ain Kermes	14009
1840	696	14	جبيلات الرصفاء	Djebilet Rosfa	Djebilet Rosfa	14061
1841	696	14	مادنة	Madna	Madna	14055
1842	696	14	مدريسة	Medrissa	Medrissa	14013
1843	697	14	سيدي عبد الرحمن	Sidi Abderrahmane	Sidi Abderrahmane	02066
1844	698	14	قرطوفة	Guertoufa	Guertoufa	14019
1845	698	14	الرحوية	Rahouia	Rahouia	14005
1846	699	14	وادي ليلي	Oued Lilli	Oued Lilli	14014
1847	699	14	سيدي علي ملال	Sidi Ali Mellal	Sidi Ali Mellal	14064
1848	699	14	تيدة	Tidda	Tidda	14071
1849	700	14	جيلالي بن عمار	Djillali Ben Amar	Djillali Ben Amar	14016
1850	700	14	مشرع الصفا	Mechraa Safa	Mechraa Safa	14012
1851	700	14	تاقدمت	Tagdempt	Tagdempt	14068
1852	701	14	تيارت	Tiaret	Tiaret	14000
1853	702	14	مدروسة	Medroussa	Medroussa	14023
1854	702	14	ملاكو	Mellakou	Mellakou	14025
1855	702	14	سيدي بختي	Sidi Bakhti	Sidi Bakhti	14065
1856	703	14	عين الذهب	Ain Deheb	Ain Deheb	14007
1857	703	14	شحيمة	Chehaima	Chehaima	14046
1858	703	14	النعيمة	Naima	Naima	14060
1859	704	14	عين بوشقيف	Ain Bouchekif	Ain Bouchekif	14040
1860	704	14	دحموني	Dahmouni	Dahmouni	14010
1861	705	15	ميزرانـــة	Mizrana	Mizrana	15061
1862	705	15	إفليـــسن	Iflissen	Iflissen	15068
1863	705	15	تيقـزيرت	Tigzirt	Tigzirt	15019
1864	706	15	إيجــار	Idjeur	Idjeur	15035
1865	706	15	بني زيكــي	Beni-Zikki	Beni-Zikki	15118
1866	706	15	إيلولة أومـــالو	Illoula Oumalou	Illoula Oumalou	15037
1867	706	15	بوزقــن	Bouzeguene	Bouzeguene	15009
1868	707	15	بني دوالة	Beni-Douala	Beni-Douala	15011
1869	707	15	بني عيسي	Beni-Aissi	Beni-Aissi	15069
1870	707	15	أيت محمود	Ait-Mahmoud	Ait-Mahmoud	15044
1871	707	15	بنــــي زمنزار	Beni Zmenzer	Beni Zmenzer	15028
1872	708	15	أقني قغران	Agouni-Gueghrane	Agouni-Gueghrane	15022
1873	708	15	أيت بــوادو	Ait Bouaddou	Ait Bouaddou	15024
1874	708	15	واضية	Ouadhias	Ouadhias	15016
1875	708	15	تيزي نثلاثة	Tizi N'tleta	Tizi N'tleta	15049
1876	709	15	أغريب	Aghribs	Aghribs	15021
1877	709	15	أيت شافع	Ait-Chafaa	Ait-Chafaa	15059
1878	709	15	أقرو	Akerrou	Akerrou	15027
1879	709	15	أزفون	Azeffoun	Azeffoun	15010
1880	710	15	أسي يوسف	Assi-Youcef	Assi-Youcef	15025
1881	710	15	بوغني	Boghni	Boghni	15003
1882	710	15	بونوح	Bounouh	Bounouh	15031
1883	710	15	مشطراس	Mechtras	Mechtras	15041
1884	711	15	ذراع بن خدة	Draa-Ben-Khedda	Draa-Ben-Khedda	15004
1885	711	15	سيدي نعمان	Sidi Namane	Sidi Namane	15042
1886	711	15	تادمايت	Tadmait	Tadmait	15018
1887	711	15	تيرمتين	Tirmitine	Tirmitine	15048
1888	712	15	أيت بومهدي	Ait Boumahdi	Ait Boumahdi	15084
1889	712	15	أيت تودرت	Ait-Toudert	Ait-Toudert	15062
1890	712	15	واسيف	Ouacif	Ouacif	15015
1891	713	15	أيت خليلي	Ait Khellili	Ait Khellili	15079
1892	713	15	مقــلع	Mekla	Mekla	15014
1893	713	15	صوامـــع	Souama	Souama	15043
1894	714	15	بني يني	Beni-Yenni	Beni-Yenni	15029
1895	714	15	إبودرارن	Iboudrarene	Iboudrarene	15073
1896	714	15	يطــافن	Yatafene	Yatafene	15052
1897	715	15	تيزي وزو	Tizi-Ouzou	Tizi-Ouzou	15000
1898	716	15	أبي يوسف	Abi-Youcef	Abi-Youcef	\N
1899	716	15	عين الحمام	Ain-El-Hammam	Ain-El-Hammam	15002
1900	716	15	أيت يحيى	Ait-Yahia	Ait-Yahia	15072
1901	716	15	اقبيل	Akbil	Akbil	15092
1902	717	15	بوجيمة	Boudjima	Boudjima	15030
1903	717	15	ماكودة	Makouda	Makouda	15040
1904	718	15	عين الزاوية	Ain-Zaouia	Ain-Zaouia	15055
1905	718	15	أيت يحي موسى	Ait Yahia Moussa	Ait Yahia Moussa	15026
1906	718	15	ذراع الميزان	Draa-El-Mizan	Draa-El-Mizan	15005
1907	718	15	فريقات	Frikat	Frikat	15067
1908	719	15	مكيرة	M'kira	M'kira	15046
1909	719	15	تيزي غنيف	Tizi-Gheniff	Tizi-Gheniff	15020
1910	720	15	إيلـيــلتـن	Illilten	Illilten	15036
1911	720	15	إمســوحال	Imsouhal	Imsouhal	15023
1912	720	15	إفــرحــونان	Iferhounene	Iferhounene	15013
1913	721	15	عزازقة	Azazga	Azazga	15001
1914	721	15	فريحة	Freha	Freha	15012
1915	721	15	إيفيغاء	Ifigha	Ifigha	15034
1916	721	15	إعــكورن	Yakourene	Yakourene	15051
1917	721	15	زكري	Zekri	Zekri	15076
1918	722	15	أيت عقـواشة	Ait Aggouacha	Ait Aggouacha	15058
1919	722	15	إيرجـــن	Irdjen	Irdjen	15038
1920	722	15	الأربعــاء ناث إيراثن	Larbaa Nath Irathen	Larbaa Nath Irathen	15006
1921	723	15	أيت  أومالو	Ait-Oumalou	Ait-Oumalou	\N
1922	723	15	تيزي راشد	Tizi-Rached	Tizi-Rached	15050
1923	724	15	أيت عيسى ميمون	Ait-Aissa-Mimoun	Ait-Aissa-Mimoun	15032
1924	724	15	واقنون	Ouaguenoun	Ouaguenoun	15045
1925	724	15	تيمـيزار	Timizart	Timizart	15039
1926	725	15	معـــاتقة	Maatkas	Maatkas	15017
1927	725	15	سوق الإثنين	Souk-El-Tenine	Souk-El-Tenine	15123
1928	726	16	حسين داي	Hussein Dey	Hussein Dey	16005
1929	726	16	القبة	Kouba	Kouba	16006
1930	726	16	محمد بلوزداد	Mohamed Belouzdad	Mohamed Belouzdad	16151
1931	726	16	المغارية	El Magharia	El Magharia	16053
1932	727	16	الكاليتوس	Les Eucalyptus	Les Eucalyptus	16057
1933	727	16	سيدي موسى	Sidi Moussa	Sidi Moussa	16189
1934	727	16	براقي	Baraki	Baraki	16027
1935	728	16	عين طاية	Ain Taya	Ain Taya	16019
1936	728	16	باب الزوار	Bab Ezzouar	Bab Ezzouar	16024
1937	728	16	برج الكيفان	Bordj El Kiffan	Bordj El Kiffan	16031
1938	728	16	الدار البيضاء	Dar El Beida	Dar El Beida	16033
1939	728	16	المحمدية	Mohammadia	Mohammadia	16058
1940	728	16	برج البحري	Bordj El Bahri	Bordj El Bahri	16046
1941	729	16	المرسى	El Marsa	El Marsa	02015
1942	730	16	بئر توتة	Bir Touta	Bir Touta	16045
1943	730	16	اولاد شبل	Ouled Chebel	Ouled Chebel	16118
1944	730	16	تسالة المرجة	Tessala El Merdja	Tessala El Merdja	16099
1945	731	16	هراوة	Herraoua	Herraoua	16116
1946	731	16	رغاية	Reghaia	Reghaia	16036
1947	731	16	الرويبة	Rouiba	Rouiba	16017
1948	732	16	المعالمة	Maalma	Maalma	16093
1949	732	16	الرحمانية	Rahmania	Rahmania	16121
1950	732	16	سويدانية	Souidania	Souidania	16097
1951	732	16	سطاوالي	Staoueli	Staoueli	16062
1952	732	16	زرالدة	Zeralda	Zeralda	16063
1953	733	16	بابا حسن	Baba Hassen	Baba Hassen	16081
1954	733	16	الدويرة	Douira	Douira	16049
1955	733	16	الدرارية	Draria	Draria	16050
1956	733	16	العاشور	El Achour	El Achour	16104
1957	733	16	الخرايسية	Khraissia	Khraissia	16091
1958	734	16	عين بنيان	Ain Benian	Ain Benian	16018
1959	734	16	الشراقة	Cheraga	Cheraga	16014
1960	734	16	دالي ابراهيم	Dely Ibrahim	Dely Ibrahim	16047
1961	734	16	اولاد فايت	Ouled Fayet	Ouled Fayet	16094
1962	735	16	الحمامات	Hammamet	Hammamet	12016
1963	736	16	الجزائر الوسطى	Alger Centre	Alger Centre	16000
1964	736	16	المدنية	El Madania	El Madania	16015
1965	736	16	المرادية	El Mouradia	El Mouradia	16035
1966	736	16	سيدي امحمد	Sidi M'hamed	Sidi M'hamed	16002
1967	737	16	السحاولة	Sehaoula	Sehaoula	16095
1968	737	16	بئر مراد رايس	Bir Mourad Rais	Bir Mourad Rais	16013
1969	737	16	بئر خادم	Birkhadem	Birkhadem	16029
1970	737	16	جسر قسنطينة	Djasr Kasentina	Djasr Kasentina	16048
1971	737	16	حيدرة	Hydra	Hydra	16016
1972	738	16	بولوغين بن زيري	Bologhine Ibnou Ziri	Bologhine Ibnou Ziri	16030
1973	738	16	القصبة	Casbah	Casbah	16001
1974	738	16	وادي قريش	Oued Koriche	Oued Koriche	16182
1975	738	16	الرايس حميدو	Rais Hamidou	Rais Hamidou	16060
1976	738	16	باب الوادي	Bab El Oued	Bab El Oued	16008
1977	739	16	ابن عكنون	Ben Aknoun	Ben Aknoun	16028
1978	739	16	بني مسوس	Beni Messous	Beni Messous	16044
1979	739	16	بوزريعة	Bouzareah	Bouzareah	16032
1980	739	16	الابيار	El Biar	El Biar	16003
1981	740	16	باش جراح	Bachedjerah	Bachedjerah	16026
1982	740	16	بوروبة	Bourouba	Bourouba	16054
1983	740	16	الحراش	El Harrach	El Harrach	16004
1984	740	16	وادي السمار	Oued Smar	Oued Smar	16059
1985	741	17	حاسي العش	Hassi El Euch	Hassi El Euch	17032
1986	741	17	زعفران	Zaafrane	Zaafrane	17038
1987	741	17	عين معبد	Ain Maabed	Ain Maabed	17025
1988	741	17	حاسي بحبح	Hassi Bahbah	Hassi Bahbah	17002
1989	742	17	عين الإبل	Ain El Ibel	Ain El Ibel	17011
1990	742	17	تعظميت	Taadmit	Taadmit	17037
1991	742	17	زكار	Zaccar	Zaccar	17065
1992	742	17	مجبارة	Moudjebara	Moudjebara	17058
1993	743	17	القديد	El Guedid	El Guedid	17019
1994	743	17	الشارف	Charef	Charef	17015
1995	743	17	بن يعقوب	Benyagoub	Benyagoub	17026
1996	744	17	سيدي بايزيد	Sidi Baizid	Sidi Baizid	17052
1997	744	17	مليليحة	M'liliha	M'liliha	17036
1998	744	17	دار الشيوخ	Dar Chioukh	Dar Chioukh	17006
1999	745	17	دويس	Douis	Douis	17030
2000	745	17	الادريسية	El Idrissia	El Idrissia	17020
2001	745	17	عين الشهداء	Ain Chouhada	Ain Chouhada	17039
2002	746	17	الجلفة	Djelfa	Djelfa	17000
2003	747	18	جيجل	Jijel	Jijel	18000
2004	748	18	العوانة	El Aouana	El Aouana	18005
2005	748	18	سلمى بن زيادة	Selma Benziada	Selma Benziada	18049
2006	749	18	أراقن سويسي	Erraguene Souissi	Erraguene Souissi	18032
2007	749	18	زيامة منصورية	Ziama Mansouriah	Ziama Mansouriah	18007
2008	750	18	بوسيف أولاد عسكر	Boussif Ouled Askeur	Boussif Ouled Askeur	18036
2009	750	18	الشحنة	Chahna	Chahna	18027
2010	750	18	الامير عبد القادر	Emir Abdelkader	Emir Abdelkader	18010
2011	750	18	وجانة	Oudjana	Oudjana	18047
2012	750	18	الطاهير	Taher	Taher	18002
2013	751	18	الشقفة	Chekfa	Chekfa	18003
2014	751	18	القنار نشفي	El Kennar Nouchfi	El Kennar Nouchfi	18030
2015	751	18	سيدي عبد العزيز	Sidi Abdelaziz	Sidi Abdelaziz	18017
2016	751	18	برج الطهر	Bordj T'har	Bordj T'har	18041
2017	752	18	الميلية	El Milia	El Milia	18001
2018	752	18	أولاد يحيى خدروش	Ouled Yahia Khadrouch	Ouled Yahia Khadrouch	18021
2019	753	18	أولاد رابح	Ouled Rabah	Ouled Rabah	18046
2020	753	18	سيدي معروف	Sidi Marouf	Sidi Marouf	18018
2021	754	18	غبالة	Ghebala	Ghebala	18026
2022	754	18	السطارة	Settara	Settara	18016
2023	755	18	بوراوي بلهادف	Bouraoui Belhadef	Bouraoui Belhadef	18023
2024	755	18	العنصر	El Ancer	El Ancer	18004
2025	755	18	خيري واد عجول	Khiri Oued Adjoul	Khiri Oued Adjoul	18024
2026	755	18	الجمعة بني حبيبي	Djemaa Beni Habibi	Djemaa Beni Habibi	18029
2027	756	18	جيملة	Djimla	Djimla	18031
2028	756	18	بودريعة بني  ياجيس	Boudria Beniyadjis	Boudria Beniyadjis	18025
2029	757	18	قاوس	Kaous	Kaous	18015
2030	757	18	تاكسنة	Texenna	Texenna	18006
2031	758	19	الرصفة	Rosfa	Rosfa	19060
2032	758	19	بوطالب	Boutaleb	Boutaleb	19089
2033	758	19	الحامة	Hamma	Hamma	19015
2034	758	19	أولاد تبان	Ouled Tebben	Ouled Tebben	19030
2035	758	19	صالح باي	Salah Bey	Salah Bey	19013
2036	759	19	واد البارد	Oued El Bared	Oued El Bared	19115
2037	759	19	تيزي نبشار	Tizi N'bechar	Tizi N'bechar	19068
2038	759	19	عموشة	Amoucha	Amoucha	19009
2039	760	19	مزلوق	Mezloug	Mezloug	19056
2040	760	19	أوريسيا	El Ouricia	El Ouricia	19047
2041	760	19	عين عباسة	Ain Abessa	Ain Abessa	19016
2042	760	19	عين أرنات	Ain Arnat	Ain Arnat	19017
2043	761	19	قلال	Guellal	Guellal	19050
2044	761	19	قصر الابطال	Kasr El Abtal	Kasr El Abtal	19054
2045	761	19	أولاد سي أحمد	Ouled Si Ahmed	Ouled Si Ahmed	19121
2046	761	19	عين ولمان	Ain Oulmene	Ain Oulmene	19002
2047	762	19	أيت نوال مزادة	Ait Naoual Mezada	Ait Naoual Mezada	19076
2048	762	19	ايت تيزي	Ait-Tizi	Ait-Tizi	19077
2049	762	19	بوعنداس	Bouandas	Bouandas	19012
2050	762	19	بوسلام	Bousselam	Bousselam	19052
2051	763	19	حمام السخنة	Hamam Soukhna	Hamam Soukhna	19059
2052	763	19	الطاية	Taya	Taya	19067
2053	763	19	التلة	Tella	Tella	19087
2054	764	19	عين أزال	Ain Azel	Ain Azel	19007
2055	764	19	عين الحجر	Ain Lahdjar	Ain Lahdjar	19018
2056	764	19	بيضاء برج	Beidha Bordj	Beidha Bordj	19021
2057	764	19	بئر حدادة	Bir Haddada	Bir Haddada	19039
2058	765	19	قنزات	Guenzet	Guenzet	19026
2059	765	19	حربيل	Harbil	Harbil	19032
2060	766	19	عين الروى	Ain-Roua	Ain-Roua	19019
2061	766	19	بني وسين	Beni Oussine	Beni Oussine	19037
2062	766	19	بوقاعة	Bougaa	Bougaa	19003
2063	767	19	ذراع قبيلة	Draa-Kebila	Draa-Kebila	19029
2064	767	19	حمام قرقور	Hammam Guergour	Hammam Guergour	19051
2065	768	19	سطيف	Setif	Setif	19000
2066	769	19	عين الكبيرة	Ain El Kebira	Ain El Kebira	19008
2067	769	19	الدهامشة	Dehamcha	Dehamcha	19041
2068	769	19	أولاد عدوان	Ouled Addouane	Ouled Addouane	19053
2069	770	19	عين السبت	Ain-Sebt	Ain-Sebt	19033
2070	770	19	بني عزيز	Beni-Aziz	Beni-Aziz	19010
2071	770	19	معاوية	Maaouia	Maaouia	19055
2072	771	19	بلاعة	Bellaa	Bellaa	19022
2073	771	19	بئر العرش	Bir-El-Arch	Bir-El-Arch	19024
2074	771	19	الولجة	El-Ouldja	El-Ouldja	19046
2075	771	19	تاشودة	Tachouda	Tachouda	19125
2076	772	19	تالة إيفاسن	Tala-Ifacene	Tala-Ifacene	19069
2077	772	19	ماوكلان	Maouaklane	Maouaklane	19028
2078	773	19	سرج الغول	Serdj-El-Ghoul	Serdj-El-Ghoul	19086
2079	773	19	بابور	Babor	Babor	19020
2080	774	19	قجال	Guidjel	Guidjel	19027
2081	774	19	أولاد صابر	Ouled Sabor	Ouled Sabor	19120
2082	775	19	بازر سكرة	Bazer-Sakra	Bazer-Sakra	19036
2083	775	19	العلمة	El Eulma	El Eulma	19001
2084	775	19	قلتة زرقاء	Guelta Zerka	Guelta Zerka	\N
2085	776	19	بني فودة	Beni Fouda	Beni Fouda	19023
2086	776	19	جميلة	Djemila	Djemila	19025
2087	777	19	عين لقراج	Ain-Legradj	Ain-Legradj	19035
2088	777	19	بني شبانة	Beni Chebana	Beni Chebana	19031
2089	777	19	بني ورتيلان	Beni Ourtilane	Beni Ourtilane	19011
2090	777	19	بني موحلي	Beni-Mouhli	Beni-Mouhli	19038
2091	778	20	سعيدة	Saida	Saida	20000
2092	779	20	تيرسين	Tircine	Tircine	20035
2093	779	20	أولاد إبراهيم	Ouled Brahim	Ouled Brahim	20002
2094	779	20	عين السلطان	Ain Soltane	Ain Soltane	20029
2095	780	20	المعمورة	Maamora	Maamora	10071
2096	781	20	الحساسنة	El Hassasna	El Hassasna	20003
2097	781	20	عين السخونة	Ain Sekhouna	Ain Sekhouna	20009
2098	782	20	سيدي بوبكر	Sidi Boubekeur	Sidi Boubekeur	20007
2099	782	20	أولاد خالد	Ouled Khaled	Ouled Khaled	20004
2100	782	20	هونت	Hounet	Hounet	20025
2101	782	20	سيدي عمر	Sidi Amar	Sidi Amar	20019
2102	783	20	يوب	Youb	Youb	20008
2103	783	20	دوي ثابت	Doui Thabet	Doui Thabet	20023
2104	784	20	سيدي احمد	Sidi Ahmed	Sidi Ahmed	20012
2105	784	20	مولاي العربي	Moulay Larbi	Moulay Larbi	20014
2106	785	20	عين الحجر	Ain El Hadjar	Ain El Hadjar	10031
2107	786	21	عين بوزيان	Ain Bouziane	Ain Bouziane	21031
2108	786	21	بني ولبان	Beni Oulbane	Beni Oulbane	21011
2109	786	21	سيدي مزغيش	Sidi Mezghiche	Sidi Mezghiche	21023
2110	787	21	صالح بو الشعور	Salah Bouchaour	Salah Bouchaour	21022
2111	787	21	زردازة	Zerdezas	Zerdezas	21047
2112	787	21	أولاد حبابة	Ouled Habbaba	Ouled Habbaba	21043
2113	787	21	مجاز الدشيش	Emjez Edchich	Emjez Edchich	21017
2114	787	21	الحروش	El Arrouch	El Arrouch	21003
2115	788	21	الحدائق	El Hadaiek	El Hadaiek	21015
2116	788	21	بوشطاطة	Bouchetata	Bouchetata	21053
2117	788	21	عين زويت	Ain Zouit	Ain Zouit	21051
2118	789	21	بني بشير	Beni Bechir	Beni Bechir	21033
2119	789	21	رمضان جمال	Ramdane Djamel	Ramdane Djamel	21004
2120	790	21	بين الويدان	Bin El Ouiden	Bin El Ouiden	21052
2121	790	21	تمالوس	Tamalous	Tamalous	21005
2122	790	21	الكركرة	Kerkara	Kerkara	21019
2123	791	21	عين قشرة	Ain Kechra	Ain Kechra	21007
2124	791	21	الولجة بولبلوط	Ouldja Boulbalout	Ouldja Boulbalout	\N
2125	792	21	أم الطوب	Oum Toub	Oum Toub	21020
2126	793	21	الغدير	El Ghedir	El Ghedir	21057
2127	793	21	السبت	Es Sebt	Es Sebt	21018
2128	793	21	عين شرشار	Ain Charchar	Ain Charchar	21006
2129	793	21	عزابة	Azzaba	Azzaba	21001
2130	793	21	جندل سعدي محمد	Djendel Saadi Mohamed	Djendel Saadi Mohamed	21037
2131	794	21	الزيتونة	Zitouna	Zitouna	21028
2132	794	21	قنواع	Kanoua	Kanoua	21062
2133	795	21	أولاد عطية	Ouled Attia	Ouled Attia	21012
2134	795	21	وادي الزهور	Oued Zhour	Oued Zhour	21040
2135	795	21	خناق مايو	Khenag Maoune	Khenag Maoune	21059
2136	796	21	القل	Collo	Collo	21002
2137	796	21	الشرايع	Cheraia	Cheraia	21030
2138	796	21	بني زيد	Beni Zid	Beni Zid	21016
2139	797	21	المرسى	El Marsa	El Marsa	02015
2140	798	21	بن عزوز	Ben Azzouz	Ben Azzouz	21010
2141	798	21	بكوش لخضر	Bekkouche Lakhdar	Bekkouche Lakhdar	21009
2142	799	21	فلفلة	Filfila	Filfila	21042
2143	799	21	حمادي كرومة	Hammadi Krouma	Hammadi Krouma	21038
2144	799	21	سكيكدة	Skikda	Skikda	21000
2145	800	22	سيدي علي بن يوب	Sidi Ali Benyoub	Sidi Ali Benyoub	22028
2146	800	22	طابية	Tabia	Tabia	22032
2147	800	22	بوخنفيس	Boukhanefis	Boukhanefis	22008
2148	801	22	مولاي سليسن	Moulay Slissen	Moulay Slissen	22026
2149	801	22	الحصيبة	El Hacaiba	El Hacaiba	22047
2150	801	22	عين تندمين	Ain Tindamine	Ain Tindamine	22036
2151	802	22	تنيرة	Tenira	Tenira	22021
2152	802	22	وادي سفيون	Oued Sefioun	Oued Sefioun	22055
2153	802	22	حاسي دحو	Hassi Dahou	Hassi Dahou	22049
2154	802	22	بن عشيبة شلية	Benachiba Chelia	Benachiba Chelia	22040
2155	803	22	وادي تاوريرة	Oued Taourira	Oued Taourira	22056
2156	803	22	مرين	Merine	Merine	22012
2157	803	22	تفسور	Tefessour	Tefessour	22065
2158	803	22	تاودموت	Taoudmout	Taoudmout	22064
2159	804	22	سيدي يعقوب	Sidi Yacoub	Sidi Yacoub	22063
2160	804	22	سيدي لحسن	Sidi Lahcene	Sidi Lahcene	22020
2161	804	22	سيدي خالد	Sidi Khaled	Sidi Khaled	07004
2162	804	22	العمارنة	Amarnas	Amarnas	22074
2163	805	22	سيدي ابراهيم	Sidi Brahim	Sidi Brahim	22029
2164	805	22	سيدي حمادوش	Sidi Hamadouche	Sidi Hamadouche	22019
2165	805	22	مكدرة	Makedra	Makedra	22051
2166	805	22	عين البرد	Ain El Berd	Ain El Berd	22022
2167	806	22	حاسي زهانة	Hassi Zahana	Hassi Zahana	22010
2168	806	22	شيطوان البلايلة	Chetouane Belaila	Chetouane Belaila	22039
2169	806	22	بن باديس	Ben Badis	Ben Badis	22004
2170	806	22	بضرابين المقراني	Bedrabine El Mokrani	Bedrabine El Mokrani	22038
2171	807	22	سفيزف	Sfisef	Sfisef	22001
2172	807	22	مسيد	M'cid	M'cid	22052
2173	807	22	بوجبهة البرج	Boudjebaa El Bordj	Boudjebaa El Bordj	22043
2174	807	22	عين أدن	Ain- Adden	Ain- Adden	22034
2175	808	22	سيدي شعيب	Sidi Chaib	Sidi Chaib	22061
2176	808	22	مرحوم	Marhoum	Marhoum	22011
2177	808	22	بئر الحمام	Bir El Hammam	Bir El Hammam	22041
2178	809	22	رجم دموش	Redjem Demouche	Redjem Demouche	22058
2179	809	22	راس الماء	Ras El Ma	Ras El Ma	22069
2180	809	22	وادي السبع	Oued Sebaa	Oued Sebaa	22054
2181	810	22	سيدي بلعباس	Sidi Bel-Abbes	Sidi Bel-Abbes	22000
2182	811	22	عين الثريد	Ain Thrid	Ain Thrid	22037
2183	811	22	السهالة الثورة	Sehala Thaoura	Sehala Thaoura	22060
2184	811	22	تسالة	Tessala	Tessala	22033
2185	812	22	بلعربي	Belarbi	Belarbi	22023
2186	812	22	مصطفى بن ابراهيم	Mostefa  Ben Brahim	Mostefa  Ben Brahim	22013
2187	812	22	تلموني	Tilmouni	Tilmouni	22044
2188	812	22	زروالة	Zerouala	Zerouala	22068
2189	813	22	الضاية	Dhaya	Dhaya	22009
2190	813	22	مزاورو	Mezaourou	Mezaourou	22025
2191	813	22	تغاليمت	Teghalimet	Teghalimet	22066
2192	813	22	تلاغ	Telagh	Telagh	22007
2193	814	22	عين قادة	Ain Kada	Ain Kada	22035
2194	814	22	لمطار	Lamtar	Lamtar	22024
2195	814	22	سيدي علي بوسيدي	Sidi Ali Boussidi	Sidi Ali Boussidi	22014
2196	814	22	سيدي دحو الزاير	Sidi Dahou Zairs	Sidi Dahou Zairs	22062
2197	815	23	عنابة	Annaba	Annaba	23000
2198	815	23	سرايدي	Seraidi	Seraidi	23015
2199	816	23	برحال	Berrahal	Berrahal	23009
2200	816	23	واد العنب	Oued El Aneb	Oued El Aneb	23021
2201	816	23	التريعات	Treat	Treat	\N
2202	817	23	الحجار	El Hadjar	El Hadjar	23004
2203	817	23	سيدي عمار	Sidi Amar	Sidi Amar	23028
2204	818	23	البوني	El Bouni	El Bouni	23010
2205	819	23	عين الباردة	Ain El Berda	Ain El Berda	23006
2206	819	23	الشرفة	Cheurfa	Cheurfa	23025
2207	820	23	العلمة	El Eulma	El Eulma	19001
2208	821	23	شطايبي	Chetaibi	Chetaibi	23014
2209	822	24	نشماية	Nechmaya	Nechmaya	24027
2210	822	24	بومهرة أحمد	Boumahra Ahmed	Boumahra Ahmed	24005
2211	822	24	جبالة الخميسي	Djeballah Khemissi	Djeballah Khemissi	24039
2212	822	24	بلخير	Belkheir	Belkheir	24015
2213	822	24	بني مزلين	Beni Mezline	Beni Mezline	\N
2214	822	24	قلعة بوصبع	Guelaat Bou Sbaa	Guelaat Bou Sbaa	24020
2215	823	24	بوحمدان	Bou Hamdane	Bou Hamdane	\N
2216	823	24	حمام دباغ	Hammam Debagh	Hammam Debagh	24007
2217	823	24	الركنية	Roknia	Roknia	24028
2218	824	24	الدهوارة	Dahouara	Dahouara	24031
2219	824	24	حمام النبايل	Hammam N'bail	Hammam N'bail	24024
2220	824	24	وادي الشحم	Oued Cheham	Oued Cheham	24009
2221	825	24	قالمة	Guelma	Guelma	24000
2222	825	24	بن جراح	Bendjarah	Bendjarah	24034
2223	826	24	عين بن بيضاء	Ain Ben Beida	Ain Ben Beida	24011
2224	826	24	بوشقوف	Bouchegouf	Bouchegouf	24002
2225	826	24	مجاز الصفاء	Medjez Sfa	Medjez Sfa	24026
2226	826	24	وادي فراغة	Oued Ferragha	Oued Ferragha	24038
2227	827	24	بوعاتي محمود	Bouati Mahmoud	Bouati Mahmoud	24018
2228	827	24	الفجوج	El Fedjoudj	El Fedjoudj	24019
2229	827	24	هيليوبوليس	Heliopolis	Heliopolis	24008
2230	828	24	مجاز عمار	Medjez Amar	Medjez Amar	24043
2231	828	24	هواري بومدين	Houari Boumedienne	Houari Boumedienne	24025
2232	828	24	رأس العقبة	Ras El Agba	Ras El Agba	24049
2233	828	24	سلاوة عنونة	Sellaoua Announa	Sellaoua Announa	24029
2234	829	24	برج صباط	Bordj Sabath	Bordj Sabath	24017
2235	829	24	وادي الزناتي	Oued Zenati	Oued Zenati	24001
2236	829	24	عين رقادة	Ain Regada	Ain Regada	24014
2237	830	24	عين العربي	Ain Larbi	Ain Larbi	24012
2238	830	24	عين مخلوف	Ain Makhlouf	Ain Makhlouf	24013
2239	830	24	تاملوكة	Tamlouka	Tamlouka	24010
2240	831	24	عين صندل	Ain Sandel	Ain Sandel	24032
2241	831	24	بوحشانة	Bou Hachana	Bou Hachana	24037
2242	831	24	لخزارة	Khezaras	Khezaras	\N
2243	832	25	ديدوش مراد	Didouche Mourad	Didouche Mourad	25024
2244	832	25	حامة بوزيان	Hamma Bouziane	Hamma Bouziane	25013
2245	833	25	بني حميدان	Beni Hamidane	Beni Hamidane	25035
2246	833	25	زيغود يوسف	Zighoud Youcef	Zighoud Youcef	25014
2247	834	25	عين السمارة	Ain Smara	Ain Smara	25006
2248	834	25	الخروب	El Khroub	El Khroub	25005
2249	834	25	أولاد رحمون	Ouled Rahmoun	Ouled Rahmoun	25028
2250	835	25	عين عبيد	Ain Abid	Ain Abid	25015
2251	835	25	أبن باديس الهرية	Ben Badis	Ben Badis	25037
2252	836	25	ابن زياد	Ibn Ziad	Ibn Ziad	25027
2253	836	25	بوجريو مسعود	Messaoud Boudjeriou	Messaoud Boudjeriou	25032
2254	837	25	قسنطينة	Constantine	Constantine	25000
2255	838	26	السواقي	Souagui	Souagui	26020
2256	838	26	جواب	Djouab	Djouab	26016
2257	838	26	سيدي زهار	Sidi Zahar	Sidi Zahar	26072
2258	838	26	سيدي زيان	Sidi Ziane	Sidi Ziane	\N
2259	839	26	العزيزية	El Azizia	El Azizia	26018
2260	839	26	مغراوة	Maghraoua	Maghraoua	26063
2261	839	26	ميهوب	Mihoub	Mihoub	26032
2262	840	26	حناشة	Hannacha	Hannacha	26027
2263	840	26	عوامري	Ouamri	Ouamri	26034
2264	840	26	وادي حربيل	Oued Harbil	Oued Harbil	26061
2265	841	26	بني سليمان	Beni Slimane	Beni Slimane	26001
2266	841	26	بوسكن	Bouskene	Bouskene	26025
2267	841	26	سيدي الربيع	Sidi Rabie	Sidi Rabie	26070
2268	842	26	بوعيشون	Bouaichoune	Bouaichoune	26055
2269	842	26	أولاد بوعشرة	Ouled Bouachra	Ouled Bouachra	26064
2270	842	26	سي المحجوب	Si Mahdjoub	Si Mahdjoub	26045
2271	843	26	البرواقية	Berrouaghia	Berrouaghia	26002
2272	843	26	أولاد دايد	Ouled Deid	Ouled Deid	26044
2273	843	26	الربعية	Rebaia	Rebaia	26039
2274	844	26	مجبر	Medjebar	Medjebar	26033
2275	844	26	ثلاث دوائر	Tletat Ed Douair	Tletat Ed Douair	26046
2276	844	26	الزبيرية	Zoubiria	Zoubiria	26021
2277	844	26	سغوان	Seghouane	Seghouane	26041
2278	845	26	العيساوية	Aissaouia	Aissaouia	26022
2279	845	26	الحوضان	El Haoudane	El Haoudane	26058
2280	845	26	مزغنة	Mezerana	Mezerana	\N
2281	845	26	تابلاط	Tablat	Tablat	26004
2282	846	26	ذراع السمار	Draa Esmar	Draa Esmar	26017
2283	846	26	المدية	Medea	Medea	26000
2284	846	26	تمسقيدة	Tamesguida	Tamesguida	26075
2285	847	26	بن شكاو	Ben Chicao	Ben Chicao	26012
2286	847	26	الحمدانية	El Hamdania	El Hamdania	26060
2287	847	26	وزرة	Ouzera	Ouzera	26019
2288	847	26	تيزي مهدي	Tizi Mahdi	Tizi Mahdi	26076
2289	848	26	بعطة	Baata	Baata	26050
2290	848	26	العمارية	El Omaria	El Omaria	26008
2291	849	26	أولاد إبراهيم	Ouled Brahim	Ouled Brahim	20002
2292	850	26	بئر بن عابد	Bir Ben Laabed	Bir Ben Laabed	26053
2293	850	26	القلب الكبير	El Guelbelkebir	El Guelbelkebir	26030
2294	850	26	سدراية	Sedraya	Sedraya	26068
2295	851	26	بوشراحيل	Bouchrahil	Bouchrahil	26014
2296	851	26	خمس جوامع	Khams Djouamaa	Khams Djouamaa	26062
2297	851	26	سيدي نعمان	Sidi Naamane	Sidi Naamane	26071
2298	852	27	فرناقة	Fornaka	Fornaka	27014
2299	852	27	الحسيان (بني ياحي	Hassiane	Hassiane	27033
2300	852	27	عين نويسي	Ain-Nouissy	Ain-Nouissy	27010
2301	853	27	وادي الخير	Oued El Kheir	Oued El Kheir	27020
2302	853	27	عين تادلس	Ain-Tedles	Ain-Tedles	27001
2303	853	27	سيدي بلعطار	Sidi Belaattar	Sidi Belaattar	27029
2304	853	27	سور	Sour	Sour	27022
2305	854	27	حاسي ماماش	Hassi Mameche	Hassi Mameche	27004
2306	854	27	مزغران	Mazagran	Mazagran	27017
2307	854	27	ستيدية	Stidia	Stidia	27023
2308	855	27	عين بودينار	Ain-Boudinar	Ain-Boudinar	27031
2309	855	27	خير الدين	Kheir-Eddine	Kheir-Eddine	27016
2310	855	27	صيادة	Sayada	Sayada	27045
2311	856	27	سيدي علي	Sidi Ali	Sidi Ali	27032
2312	856	27	تزقايت	Tazgait	Tazgait	27047
2313	856	27	أولاد مع الله	Ouled-Maalah	Ouled-Maalah	27028
2314	857	27	بن عبد المالك رمضان	Benabdelmalek Ramdane	Benabdelmalek Ramdane	27008
2315	857	27	حجاج	Hadjadj	Hadjadj	27015
2316	857	27	سيدي لخضر	Sidi-Lakhdar	Sidi-Lakhdar	27007
2317	858	27	مستغانم	Mostaganem	Mostaganem	27000
2318	859	27	عشعاشة	Achaacha	Achaacha	27009
2319	859	27	خضرة	Khadra	Khadra	27005
2320	859	27	نكمارية	Nekmaria	Nekmaria	27026
2321	859	27	أولاد بوغالم	Ouled Boughalem	Ouled Boughalem	27027
2322	860	27	بوقيراط	Bouguirat	Bouguirat	27003
2323	860	27	صفصاف	Safsaf	Safsaf	\N
2324	860	27	سيرات	Sirat	Sirat	27021
2325	860	27	السوافلية	Souaflia	Souaflia	27046
2326	861	27	عين سيدي الشريف	Ain-Sidi Cherif	Ain-Sidi Cherif	27024
2327	861	27	ماسرة	Mesra	Mesra	27018
2328	861	27	الطواهرية	Touahria	Touahria	27013
2329	862	27	منصورة	Mansourah	Mansourah	13062
2330	863	28	شلال	Chellal	Chellal	28014
2331	863	28	أولاد ماضي	Ouled Madhi	Ouled Madhi	28047
2332	863	28	خطوطي سد الجير	Khettouti Sed-El-Jir	Khettouti Sed-El-Jir	28056
2333	864	28	بلعايبة	Belaiba	Belaiba	28026
2334	864	28	برهوم	Berhoum	Berhoum	28010
2335	864	28	دهاهنة	Dehahna	Dehahna	28048
2336	864	28	مقرة	Magra	Magra	28006
2337	864	28	عين الخضراء	Ain Khadra	Ain Khadra	28008
2338	865	28	بني يلمان	Beni Ilmane	Beni Ilmane	28027
2339	865	28	بوطي السايح	Bouti Sayeh	Bouti Sayeh	28042
2340	865	28	سيدي عيسى	Sidi Aissa	Sidi Aissa	28002
2341	866	28	عين الحجل	Ain El Hadjel	Ain El Hadjel	28003
2342	867	28	جبل مساعد	Djebel Messaad	Djebel Messaad	28024
2343	868	28	المسيلة	M'sila	M'sila	28000
2344	869	28	حمام الضلعة	Hammam Dalaa	Hammam Dalaa	28005
2345	869	28	ونوغة	Ouanougha	Ouanougha	28017
2346	869	28	أولاد منصور	Ouled Mansour	Ouled Mansour	28060
2347	869	28	تارمونت	Tarmount	Tarmount	28038
2348	870	28	أولاد دراج	Ouled Derradj	Ouled Derradj	28022
2349	870	28	السوامع	Souamaa	Souamaa	28064
2350	870	28	أولاد عدي لقبالة	Ouled Addi Guebala	Ouled Addi Guebala	28021
2351	871	28	الحوامد	El Houamed	El Houamed	\N
2352	871	28	خبانة	Khoubana	Khoubana	28030
2353	871	28	مسيف	M'cif	M'cif	28029
2354	872	29	وادي الأبطال	Oued El Abtal	Oued El Abtal	29016
2355	872	29	سيدي عبد الجبار	Sidi Abdeldjebar	Sidi Abdeldjebar	29065
2356	872	29	عين فراح	Ain Ferah	Ain Ferah	29032
2357	873	29	سيدي عبد المومن	Sidi Abdelmoumene	Sidi Abdelmoumene	29054
2358	873	29	سجرارة	Sedjerara	Sedjerara	29062
2359	873	29	مقطع الدوز	Mocta-Douz	Mocta-Douz	29027
2360	873	29	فراقيق	Ferraguig	Ferraguig	29046
2361	873	29	الغمري	El Ghomri	El Ghomri	29023
2362	874	29	المحمدية	Mohammadia	Mohammadia	16058
2363	875	29	تيغنيف	Tighennif	Tighennif	29004
2364	875	29	سيدي قادة	Sidi Kada	Sidi Kada	29030
2365	875	29	السهايلية	Sehailia	Sehailia	29063
2366	876	29	زهانة	Zahana	Zahana	29019
2367	876	29	القعدة	El Gaada	El Gaada	29041
2368	877	29	رأس عين عميروش	Ras El Ain Amirouche	Ras El Ain Amirouche	29060
2369	877	29	عقاز	Oggaz	Oggaz	29029
2370	877	29	العلايمية	Alaimia	Alaimia	29036
2371	878	29	سيق	Sig	Sig	29001
2372	878	29	الشرفاء	Chorfa	Chorfa	29039
2373	878	29	بوهني	Bou Henni	Bou Henni	29022
2374	879	29	المأمونية	El Mamounia	El Mamounia	29056
2375	880	29	القطنة	El Gueitena	El Gueitena	29042
2376	880	29	بوحنيفية	Bouhanifia	Bouhanifia	29005
2377	880	29	حسين	Hacine	Hacine	29014
2378	881	29	عين فارس	Ain Fares	Ain Fares	28023
2379	882	29	غروس	Gharrous	Gharrous	29047
2380	882	29	بنيان	Benian	Benian	29038
2381	882	29	عوف	Aouf	Aouf	29021
2382	883	29	قرجوم	Guerdjoum	Guerdjoum	29050
2383	883	29	وادي التاغية	Oued Taria	Oued Taria	29017
2384	884	29	عين أفرص	Ain Frass	Ain Frass	29034
2385	884	29	عين فكان	Ain Fekan	Ain Fekan	29011
2386	885	29	خلوية	Khalouia	Khalouia	29025
2387	885	29	المنور	El Menaouer	El Menaouer	29044
2388	885	29	البرج	El Bordj	El Bordj	29012
2389	886	29	سيدي بوسعيد	Sidi Boussaid	Sidi Boussaid	29069
2390	886	29	المطمور	Matemore	Matemore	29026
2391	886	29	ماقضة	Makhda	Makhda	29055
2392	886	29	غريس	Ghriss	Ghriss	29006
2393	886	29	ماوسة	Maoussa	Maoussa	29015
2394	887	29	معسكر	Mascara	Mascara	29000
2395	888	29	القرط	El Keurt	El Keurt	29043
2396	888	29	فروحة	Froha	Froha	29024
2397	888	29	تيزي	Tizi	Tizi	\N
2398	889	29	الحشم	El Hachem	El Hachem	29013
2399	889	29	نسمط	Nesmot	Nesmot	29058
2400	889	29	زلامطة	Zelamta	Zelamta	29057
2401	890	30	ورقلة	Ouargla	Ouargla	30000
2402	890	30	الرويسات	Rouissat	Rouissat	30013
2403	891	30	حاسي مسعود	Hassi Messaoud	Hassi Messaoud	30001
2404	892	30	عين البيضاء	Ain Beida	Ain Beida	04001
2405	893	30	حاسي بن عبد الله	Hassi Ben Abdellah	Hassi Ben Abdellah	30052
2406	893	30	سيدي خويلد	Sidi Khouiled	Sidi Khouiled	30035
2407	894	30	البرمة	El Borma	El Borma	30025
2408	895	30	انقوسة	N'goussa	N'goussa	30026
2409	896	31	سيدي الشحمي	Sidi Chami	Sidi Chami	31038
2410	896	31	الكرمة	El Kerma	El Kerma	31026
2411	896	31	السانية	Es Senia	Es Senia	31005
2412	897	31	حاسي مفسوخ	Hassi Mefsoukh	Hassi Mefsoukh	31046
2413	897	31	قديل	Gdyel	Gdyel	31017
2414	897	31	بن فريحة	Ben Freha	Ben Freha	31027
2415	898	31	بئر الجير	Bir El Djir	Bir El Djir	31001
2416	898	31	حاسي بن عقبة	Hassi Ben Okba	Hassi Ben Okba	31049
2417	898	31	حاسي بونيف	Hassi Bounif	Hassi Bounif	31028
2418	899	31	أرزيو	Arzew	Arzew	31004
2419	899	31	سيدي بن يبقى	Sidi Ben Yebka	Sidi Ben Yebka	31058
2420	900	31	عين البية	Ain Biya	Ain Biya	31040
2421	900	31	بطيوة	Bethioua	Bethioua	31015
2422	900	31	مرسى الحجاج	Marsat El Hadjadj	Marsat El Hadjadj	31030
2423	901	31	عين الترك	Ain Turk	Ain Turk	10033
2424	902	31	وهران	Oran	Oran	31000
2425	903	31	العنصر	El Ancor	El Ancor	31043
2526	939	36	عصفور	Asfour	Asfour	36012
2426	903	31	المرسى الكبير	Mers El Kebir	Mers El Kebir	31019
2427	903	31	بوسفر	Bousfer	Bousfer	31025
2428	904	31	بوفاتيس	Boufatis	Boufatis	31024
2429	904	31	البراية	El Braya	El Braya	31070
2430	904	31	وادي تليلات	Oued Tlelat	Oued Tlelat	31037
2431	904	31	طفراوي	Tafraoui	Tafraoui	31077
2432	905	31	عين الكرمة	Ain Kerma	Ain Kerma	31059
2433	905	31	بوتليليس	Boutlelis	Boutlelis	31016
2434	905	31	مسرغين	Messerghin	Messerghin	31031
2435	906	32	عين العراك	Ain El Orak	Ain El Orak	32019
2436	906	32	البنود	El Bnoud	El Bnoud	32025
2437	907	32	كراكدة	Krakda	Krakda	32027
2438	908	32	سيدي سليمان	Sidi Slimane	Sidi Slimane	30030
2439	908	32	بوعلام	Boualem	Boualem	32006
2440	908	32	سيدي طيفور	Sidi Tiffour	Sidi Tiffour	32032
2441	908	32	ستيتن	Stitten	Stitten	32033
2442	909	32	سيدي عامر	Sidi Ameur	Sidi Ameur	\N
2443	910	32	بوقطب	Bougtoub	Bougtoub	32001
2444	910	32	الخيثر	El Kheiter	El Kheiter	32011
2445	910	32	توسمولين	Tousmouline	Tousmouline	32034
2446	911	32	البيض	El Bayadh	El Bayadh	32000
2447	912	32	رقاصة	Rogassa	Rogassa	32018
2448	912	32	الكاف الأحمر	Kef El Ahmar	Kef El Ahmar	32013
2449	913	32	المحرة	El Mehara	El Mehara	32024
2450	914	33	برج عمر إدريس	Bordj Omar Driss	Bordj Omar Driss	33003
2451	914	33	دبداب	Debdeb	Debdeb	33004
2452	914	33	إن أمناس	In Amenas	In Amenas	33001
2453	915	33	إيليزي	Illizi	Illizi	33000
2454	916	34	الحمادية	Elhammadia	Elhammadia	\N
2455	916	34	العش	El Euch	El Euch	34029
2456	916	34	القصور	Ksour	Ksour	34048
2457	916	34	الرابطة	Rabta	Rabta	34035
2458	917	34	أولاد سيدي ابراهيم	Ouled Sidi-Brahim	Ouled Sidi-Brahim	28032
2459	918	34	عين تاغروت	Ain Taghrout	Ain Taghrout	34010
2460	918	34	تيكستار	Tixter	Tixter	34022
2461	919	34	بليمور	Belimour	Belimour	34025
2462	919	34	العناصر	El Annasseur	El Annasseur	34030
2463	919	34	غيلاسة	Ghailasa	Ghailasa	34031
2464	919	34	تقلعيت	Taglait	Taglait	34059
2465	919	34	برج الغدير	Bordj Ghedir	Bordj Ghedir	34004
2466	920	34	سيدي أمبارك	Sidi-Embarek	Sidi-Embarek	34020
2467	920	34	خليل	Khelil	Khelil	34028
2468	920	34	بئر قاصد علي	Bir Kasdali	Bir Kasdali	34011
2469	921	34	تفرق	Tefreg	Tefreg	34061
2470	921	34	الماين	El Main	El Main	34018
2471	921	34	جعافرة	Djaafra	Djaafra	34016
2472	921	34	القلة	Colla	Colla	34015
2473	922	34	ثنية النصر	Teniet En Nasr	Teniet En Nasr	34021
2474	922	34	الياشير	El Achir	El Achir	34006
2475	922	34	حسناوة	Hasnaoua	Hasnaoua	34068
2476	922	34	مجانة	Medjana	Medjana	34009
2477	923	34	المهير	El M'hir	El M'hir	34019
2478	923	34	المنصورة	Mansoura	Mansoura	34008
2479	923	34	حرازة	Haraza	Haraza	34047
2480	923	34	بن داود	Ben Daoud	Ben Daoud	34073
2481	924	34	عين تسرة	Ain Tesra	Ain Tesra	34027
2482	924	34	أولاد أبراهم	Ouled Brahem	Ouled Brahem	34032
2483	924	34	رأس الوادي	Ras El Oued	Ras El Oued	34001
2484	925	34	برج زمورة	Bordj Zemmoura	Bordj Zemmoura	34005
2485	925	34	أولاد دحمان	Ouled Dahmane	Ouled Dahmane	34033
2486	925	34	تسامرت	Tassamert	Tassamert	34026
2487	926	34	برج بوعريرج	B. B. Arreridj	B. B. Arreridj	34000
2488	927	35	الخروبة	El Kharrouba	El Kharrouba	\N
2489	927	35	بوزقزة قدارة	Bouzegza Keddara	Bouzegza Keddara	35038
2490	927	35	أولاد هداج	Ouled Hedadj	Ouled Hedadj	35052
2491	927	35	بودواو	Boudouaou	Boudouaou	35003
2492	927	35	بودواو البحري	Boudouaou El Bahri	Boudouaou El Bahri	35023
2493	928	35	دلس	Dellys	Dellys	35004
2494	928	35	بن شود	Ben Choud	Ben Choud	35033
2495	928	35	أعفير	Afir	Afir	35022
2496	929	35	الثنية	Thenia	Thenia	35005
2497	929	35	بني عمران	Beni Amrane	Beni Amrane	35006
2498	929	35	عمال	Ammal	Ammal	35031
2499	929	35	سوق الحد	Souk El Had	Souk El Had	\N
2500	930	35	خميس الخشنة	Khemis El Khechna	Khemis El Khechna	35010
2501	930	35	الاربعطاش	Larbatache	Larbatache	35017
2502	930	35	أولاد موسى	Ouled Moussa	Ouled Moussa	35011
2503	930	35	حمادي	Hammedi	Hammedi	35015
2504	931	35	تيمزريت	Timezrit	Timezrit	06019
2505	932	35	زموري	Zemmouri	Zemmouri	35012
2506	932	35	لقاطة	Leghata	Leghata	35026
2507	932	35	جنات	Djinet	Djinet	35024
2508	932	35	برج منايل	Bordj Menaiel	Bordj Menaiel	35001
2509	933	35	يسر	Isser	Isser	35009
2510	933	35	شعبة العامر	Chabet El Ameur	Chabet El Ameur	35008
2511	933	35	سي مصطفى	Si Mustapha	Si Mustapha	35028
2512	934	35	أولاد عيسى	Ouled Aissa	Ouled Aissa	01051
2513	934	35	الناصرية	Naciria	Naciria	35018
2514	935	35	سيدي داود	Sidi Daoud	Sidi Daoud	35019
2515	935	35	بغلية	Baghlia	Baghlia	35013
2516	935	35	تاورقة	Taourga	Taourga	35029
2517	936	35	تيجلابين	Tidjelabine	Tidjelabine	35021
2518	936	35	بومرداس	Boumerdes	Boumerdes	35000
2519	936	35	قورصو	Corso	Corso	35014
2520	937	36	عين العسل	Ain El Assel	Ain El Assel	36010
2521	937	36	بوقوس	Bougous	Bougous	36029
2522	937	36	الطارف	El Tarf	El Tarf	36000
2523	938	36	الزيتونة	Zitouna	Zitouna	21028
2524	939	36	البسباس	Besbes	Besbes	36017
2525	939	36	زريزر	Zerizer	Zerizer	36015
2527	940	36	عين الكرمة	Ain Kerma	Ain Kerma	31059
2528	941	36	بوحجار	Bouhadjar	Bouhadjar	36005
2529	941	36	حمام بني صالح	Hammam Beni Salah	Hammam Beni Salah	36036
2530	941	36	وادي الزيتون	Oued Zitoun	Oued Zitoun	36044
2531	942	36	بن مهيدي	Ben M Hidi	Ben M Hidi	36003
2532	942	36	بريحان	Berrihane	Berrihane	36027
2533	942	36	الشط	Echatt	Echatt	36025
2534	943	36	شبيطة مختار	Chebaita Mokhtar	Chebaita Mokhtar	36013
2535	943	36	شحاني	Chihani	Chihani	36014
2536	943	36	الذرعـان	Drean	Drean	36001
2537	944	36	العيون	El Aioun	El Aioun	36018
2538	944	36	القالة	El Kala	El Kala	36002
2539	944	36	السوارخ	Souarekh	Souarekh	36020
2540	944	36	رمل السوق	Raml Souk	Raml Souk	36021
2541	945	36	بوثلجة	Bouteldja	Bouteldja	36006
2542	945	36	الشافية	Chefia	Chefia	36032
2543	945	36	بحيرة الطيور	Lac Des Oiseaux	Lac Des Oiseaux	36019
2544	946	37	تندوف	Tindouf	Tindouf	37000
2545	946	37	أم العسل	Oum El Assel	Oum El Assel	37003
2546	947	38	خميستي	Khemisti	Khemisti	38016
2547	947	38	العيون	Layoune	Layoune	38007
2548	948	38	ثنية الاحد	Theniet El Had	Theniet El Had	38003
2549	948	38	سيدي بوتوشنت	Sidi Boutouchent	Sidi Boutouchent	38026
2550	949	38	أولاد بسام	Ouled Bessam	Ouled Bessam	38014
2551	949	38	تيسمسيلت	Tissemsilt	Tissemsilt	38000
2552	950	38	سيدي العنتري	Sidi Lantri	Sidi Lantri	38027
2553	950	38	لرجام	Lardjem	Lardjem	38002
2554	950	38	الملعب	Melaab	Melaab	38013
2555	950	38	تملاحت	Tamellahet	Tamellahet	38029
2556	951	38	بني شعيب	Beni Chaib	Beni Chaib	38019
2557	951	38	بني لحسن	Beni Lahcene	Beni Lahcene	38020
2558	951	38	برج بونعامة	Bordj Bounaama	Bordj Bounaama	38001
2559	952	38	سيدي عابد	Sidi Abed	Sidi Abed	38025
2560	952	38	عماري	Ammari	Ammari	38012
2561	952	38	المعاصم	Maacem	Maacem	38023
2562	953	38	سيدي سليمان	Sidi Slimane	Sidi Slimane	30030
2563	954	38	بوقائد	Boucaid	Boucaid	38005
2564	954	38	الأزهرية	Lazharia	Lazharia	38008
2565	955	38	الأربعاء	Larbaa	Larbaa	09002
2566	956	38	اليوسفية	Youssoufia	Youssoufia	38031
2567	956	38	برج الأمير عبد القادر	Bordj El Emir Abdelkader	Bordj El Emir Abdelkader	38041
2568	957	39	دوار الماء	Douar El Maa	Douar El Maa	39024
2569	957	39	بن  قشة	Ben Guecha	Ben Guecha	39048
2570	957	39	الطالب العربي	Taleb Larbi	Taleb Larbi	39019
2571	958	39	العقلة	El Ogla	El Ogla	12015
2572	959	39	المقرن	Magrane	Magrane	39015
2573	959	39	سيدي عون	Sidi Aoun	Sidi Aoun	39037
2574	960	39	اميه وانسة	Mih Ouansa	Mih Ouansa	39030
2575	960	39	وادي العلندة	Oued El Alenda	Oued El Alenda	39033
2576	961	39	كوينين	Kouinine	Kouinine	39014
2577	961	39	الوادي	El-Oued	El-Oued	39000
2578	962	39	البياضة	Bayadha	Bayadha	39007
2579	963	39	النخلة	Nakhla	Nakhla	39031
2580	963	39	الرباح	Robbah	Robbah	39017
2581	964	39	قمار	Guemar	Guemar	39002
2582	964	39	ورماس	Ourmes	Ourmes	39035
2583	964	39	تغزوت	Taghzout	Taghzout	39083
2584	965	39	الحمراية	Hamraia	Hamraia	39061
2585	965	39	الرقيبة	Reguiba	Reguiba	39016
2586	966	39	الدبيلة	Debila	Debila	39003
2587	966	39	حساني عبد الكريم	Hassani Abdelkrim	Hassani Abdelkrim	39020
2588	967	39	حاسي خليفة	Hassi Khalifa	Hassi Khalifa	39013
2589	967	39	الطريفاوي	Trifaoui	Trifaoui	39044
2590	968	40	خيران	Khirane	Khirane	40036
2591	968	40	جلال	Djellal	Djellal	40015
2592	968	40	الولجة	El Oueldja	El Oueldja	19046
2593	968	40	ششار	Chechar	Chechar	40008
2594	969	40	بابار	Babar	Babar	40006
2595	970	40	المحمل	El Mahmal	El Mahmal	40012
2596	970	40	أولاد رشاش	Ouled Rechache	Ouled Rechache	40013
2597	971	40	يابوس	Yabous	Yabous	40023
2598	971	40	شلية	Chelia	Chelia	40030
2599	971	40	بوحمامة	Bouhmama	Bouhmama	40007
2600	971	40	مصارة	M'sara	M'sara	40039
2601	972	40	خنشلة	Khenchela	Khenchela	40000
2602	973	40	قايس	Kais	Kais	40001
2603	973	40	الرميلة	Remila	Remila	40041
2604	973	40	تاوزيانت	Taouzianat	Taouzianat	40011
2605	974	40	بغاي	Baghai	Baghai	40014
2606	974	40	الحامة	El Hamma	El Hamma	40031
2607	974	40	انسيغة	Ensigha	Ensigha	40043
2608	974	40	طامزة	Tamza	Tamza	40024
2609	975	40	عين الطويلة	Ain Touila	Ain Touila	40028
2610	975	40	متوسة	M'toussa	M'toussa	40021
2611	976	41	سوق أهراس	Souk Ahras	Souk Ahras	41000
2612	977	41	عين سلطان	Ain Soltane	Ain Soltane	20029
2613	977	41	سدراتة	Sedrata	Sedrata	41006
2614	977	41	خميسة	Khemissa	Khemissa	41031
2615	978	41	الحنانشة	Hanencha	Hanencha	41016
2616	978	41	المشروحة	Machroha	Machroha	41010
2617	979	41	عين الزانة	Ain Zana	Ain Zana	41027
2618	979	41	أولاد إدريس	Ouled Driss	Ouled Driss	41005
2619	980	41	ترقالت	Terraguelt	Terraguelt	41037
2620	980	41	أم العظايم	Oum El Adhaim	Oum El Adhaim	41019
2621	980	41	وادي الكبريت	Oued Kebrit	Oued Kebrit	41018
2622	981	41	تيفاش	Tiffech	Tiffech	41038
2623	981	41	الراقوبة	Ragouba	Ragouba	41033
2624	981	41	مداوروش	M'daourouche	M'daourouche	41001
2625	982	41	الدريعة	Drea	Drea	41015
2626	982	41	تاورة	Taoura	Taoura	41009
2627	982	41	الزعرورية	Zaarouria	Zaarouria	41025
2628	983	41	الحدادة	Haddada	Haddada	41012
2629	983	41	الخضارة	Khedara	Khedara	41013
2630	983	41	أولاد مومن	Ouled Moumen	Ouled Moumen	41034
2631	984	41	المراهنة	Merahna	Merahna	41004
2632	984	41	ويلان	Ouillen	Ouillen	41029
2633	984	41	سيدي فرج	Sidi Fredj	Sidi Fredj	\N
2634	985	41	بئر بوحوش	Bir Bouhouche	Bir Bouhouche	41011
2635	985	41	سافل الويدان	Safel El Ouiden	Safel El Ouiden	41035
2636	985	41	الزوابي	Zouabi	Zouabi	41039
2637	986	42	حجوط	Hadjout	Hadjout	42001
2638	986	42	مراد	Merad	Merad	42019
2639	987	42	مناصر	Menaceur	Menaceur	42018
2640	987	42	الناظور	Nador	Nador	42039
2641	987	42	سيدي عامر	Sidi-Amar	Sidi-Amar	20019
2642	988	42	أغبال	Aghbal	Aghbal	42035
2643	988	42	قوراية	Gouraya	Gouraya	42007
2644	988	42	مسلمون	Messelmoun	Messelmoun	42036
2645	989	42	شرشال	Cherchell	Cherchell	42002
2646	989	42	حجرة النص	Hadjret Ennous	Hadjret Ennous	42029
2647	989	42	سيدي غيلاس	Sidi Ghiles	Sidi Ghiles	42021
2648	989	42	سيدي سميان	Sidi Semiane	Sidi Semiane	42041
2649	990	42	الداموس	Damous	Damous	42014
2650	990	42	الأرهاط	Larhat	Larhat	42017
2651	990	42	بني ميلك	Beni Mileuk	Beni Mileuk	42024
2652	991	42	فوكة	Fouka	Fouka	42006
2653	991	42	دواودة	Douaouda	Douaouda	42015
2654	992	42	عين تاقورايت	Ain Tagourait	Ain Tagourait	42023
2655	992	42	بوهارون	Bou Haroun	Bou Haroun	42009
2656	992	42	بواسماعيل	Bou Ismail	Bou Ismail	42004
2657	993	42	خميستي	Khemisti	Khemisti	38016
2658	994	42	أحمر العين	Ahmer El Ain	Ahmer El Ain	42005
2659	994	42	بورقيقة	Bourkika	Bourkika	42011
2660	994	42	سيدي راشد	Sidi Rached	Sidi Rached	42040
2661	995	42	الحطاطبة	Attatba	Attatba	42008
2662	995	42	الشعيبة	Chaiba	Chaiba	42047
2663	995	42	القليعة	Kolea	Kolea	42003
2664	996	42	تيبازة	Tipaza	Tipaza	42000
2665	997	43	مشيرة	El Mechira	El Mechira	43026
2666	997	43	التلاغمة	Teleghma	Teleghma	43008
2667	997	43	وادي سقان	Oued Seguen	Oued Seguen	43031
2668	998	43	العياضي برباس	El Ayadi Barbes	El Ayadi Barbes	43050
2669	998	43	 عين البيضاء أحريش	Ain Beida Harriche	Ain Beida Harriche	43014
2670	999	43	تسالة لمطاعي	Tassala Lematai	Tassala Lematai	43034
2671	999	43	ترعي باينان	Terrai Bainen	Terrai Bainen	43018
2672	999	43	اعميرة اراس	Amira Arres	Amira Arres	43017
2673	1000	43	تسدان حدادة	Tassadane Haddada	Tassadane Haddada	43033
2674	1000	43	مينار زارزة	Minar Zarza	Minar Zarza	43036
2675	1001	43	سيدي مروان	Sidi Merouane	Sidi Merouane	43010
2676	1001	43	الشيقارة	Chigara	Chigara	43025
2677	1002	43	حمالة	Hamala	Hamala	43052
2678	1002	43	القرارم قوقة	Grarem Gouga	Grarem Gouga	43004
2679	1003	43	تيبرقنت	Tiberguent	Tiberguent	43035
2680	1003	43	الرواشد	Rouached	Rouached	43009
2681	1004	43	دراحي بوصلاح	Derrahi Bousselah	Derrahi Bousselah	43046
2682	1004	43	بوحاتم	Bouhatem	Bouhatem	43022
2683	1005	43	زغاية	Zeghaia	Zeghaia	43012
2684	1005	43	وادي النجاء	Oued Endja	Oued Endja	43006
2685	1005	43	أحمد راشدي	Ahmed Rachedi	Ahmed Rachedi	43013
2686	1006	43	تاجنانت	Tadjenanet	Tadjenanet	43007
2687	1006	43	أولاد اخلوف	Ouled Khalouf	Ouled Khalouf	43032
2688	1006	43	بن يحي عبد الرحمن	Benyahia Abderrahmane	Benyahia Abderrahmane	43020
2689	1007	43	عين الملوك	Ain Mellouk	Ain Mellouk	43015
2690	1007	43	وادي العثمانية	Oued Athmenia	Oued Athmenia	43005
2691	1007	43	شلغوم العيد	Chelghoum Laid	Chelghoum Laid	43001
2692	1008	43	عين التين	Ain Tine	Ain Tine	43016
2693	1008	43	سيدي خليفة	Sidi Khelifa	Sidi Khelifa	43058
2694	1008	43	ميلة	Mila	Mila	43000
2695	1009	43	يحي بني قشة	Yahia Beniguecha	Yahia Beniguecha	43071
2696	1009	43	فرجيوة	Ferdjioua	Ferdjioua	43002
2697	1010	44	خميس مليانة	Khemis-Miliana	Khemis-Miliana	44001
2698	1010	44	سيدي الأخضر	Sidi-Lakhdar	Sidi-Lakhdar	27007
2699	1011	44	عين البنيان	Ain-Benian	Ain-Benian	44035
2700	1011	44	عين التركي	Ain-Torki	Ain-Torki	44020
2701	1011	44	حمام ريغة	Hammam-Righa	Hammam-Righa	44023
2702	1012	44	بوراشد	Bourached	Bourached	44044
2703	1012	44	جليدة	Djelida	Djelida	44009
2704	1012	44	جمعة أولاد الشيخ	Djemaa Ouled Cheikh	Djemaa Ouled Cheikh	44047
2705	1013	44	الحسينية	Hoceinia	Hoceinia	44048
2706	1013	44	بومدفع	Boumedfaa	Boumedfaa	44004
2707	1014	44	عريب	Arib	Arib	44008
2708	1014	44	العامرة	El-Amra	El-Amra	44010
2709	1014	44	المخاطرية	Mekhatria	Mekhatria	44050
2710	1015	44	العطاف	El-Attaf	El-Attaf	44002
2711	1015	44	تبركانين	Tiberkanine	Tiberkanine	44030
2712	1016	44	عين بويحيى	Ain-Bouyahia	Ain-Bouyahia	44032
2713	1016	44	العبادية	El-Abadia	El-Abadia	44006
2714	1016	44	تاشتة زقاغة	Tacheta Zegagha	Tacheta Zegagha	44028
2715	1017	44	بربوش	Birbouche	Birbouche	44042
2716	1017	44	جندل	Djendel	Djendel	44005
2717	1017	44	وادي الشرفاء	Oued Chorfa	Oued Chorfa	44024
2718	1018	44	بن علال	Ben Allal	Ben Allal	44040
2719	1018	44	مليانة	Miliana	Miliana	44003
2720	1019	44	عين الاشياخ	Ain-Lechiakh	Ain-Lechiakh	44018
2721	1019	44	واد الجمعة	Oued Djemaa	Oued Djemaa	44049
2722	1020	44	عين السلطان	Ain-Soltane	Ain-Soltane	20029
2723	1021	44	الماين	El-Maine	El-Maine	44051
2724	1021	44	الروينة	Rouina	Rouina	44017
2725	1021	44	زدين	Zeddine	Zeddine	44031
2726	1022	44	بئر ولد خليفة	Bir-Ould-Khelifa	Bir-Ould-Khelifa	44043
2727	1022	44	برج الأمير خالد	Bordj-Emir-Khaled	Bordj-Emir-Khaled	44021
2728	1022	44	طارق بن زياد	Tarik-Ibn-Ziad	Tarik-Ibn-Ziad	44029
2729	1023	44	بطحية	Bathia	Bathia	44041
2730	1023	44	بلعاص	Belaas	Belaas	44038
2731	1023	44	الحسانية	Hassania	Hassania	44022
2732	1024	44	عين الدفلى	Ain-Defla	Ain-Defla	44000
2733	1025	45	تيوت	Tiout	Tiout	45030
2734	1025	45	عين الصفراء	Ain Sefra	Ain Sefra	45001
2735	1026	45	مغرار	Moghrar	Moghrar	45014
2736	1026	45	جنين بورزق	Djenienne Bourezg	Djenienne Bourezg	45013
2737	1027	45	عسلة	Asla	Asla	45012
2738	1028	45	القصدير	Kasdir	Kasdir	45024
2739	1028	45	مكمن بن عمار	Makmen Ben Amar	Makmen Ben Amar	45005
2740	1029	45	المشرية	Mecheria	Mecheria	45002
2741	1029	45	البيوض	El Biodh	El Biodh	45004
2742	1029	45	عين بن خليل	Ain Ben Khelil	Ain Ben Khelil	45008
2743	1030	45	النعامة	Naama	Naama	45000
2744	1031	45	سفيسيفة	Sfissifa	Sfissifa	45021
2745	1032	46	سيدي بومدين	Sidi Boumediene	Sidi Boumediene	46051
2746	1032	46	تامزورة	Tamzoura	Tamzoura	46026
2747	1032	46	وادي الصباح	Oued Sebbah	Oued Sebbah	46023
2748	1032	46	عين الأربعاء	Ain El Arbaa	Ain El Arbaa	46009
2749	1033	46	شعبة اللحم	Chaabat El Ham	Chaabat El Ham	46011
2750	1033	46	المالح	El Maleh	El Maleh	46067
2751	1033	46	أولاد الكيحل	Ouled Kihal	Ouled Kihal	46038
2752	1033	46	تارقة	Terga	Terga	46015
2753	1034	46	شنتوف	Chentouf	Chentouf	\N
2754	1034	46	الحساسنة	Hassasna	Hassasna	20003
2755	1034	46	وادي برقش	Oued Berkeche	Oued Berkeche	46022
2756	1034	46	حمام بوحجر	Hammam Bou Hadjar	Hammam Bou Hadjar	46005
2757	1035	46	العامرية	El Amria	El Amria	46006
2758	1035	46	حاسي الغلة	Hassi El Ghella	Hassi El Ghella	46012
2759	1035	46	أولاد بوجمعة	Ouled Boudjemaa	Ouled Boudjemaa	46043
2760	1035	46	المساعيد	El Messaid	El Messaid	46035
2761	1035	46	بوزجار	Bouzedjar	Bouzedjar	46033
2762	1036	46	أغلال	Aghlal	Aghlal	46016
2763	1036	46	عين الكيحل	Ain Kihal	Ain Kihal	46008
2764	1036	46	عين الطلبة	Ain Tolba	Ain Tolba	46010
2765	1036	46	عقب الليل	Aoubellil	Aoubellil	46017
2766	1037	46	بني صاف	Beni Saf	Beni Saf	46001
2767	1037	46	سيدي صافي	Sidi Safi	Sidi Safi	46025
2768	1038	46	الأمير عبد القادر	Emir Abdelkader	Emir Abdelkader	18010
2769	1039	46	ولهاصة الغرابة	Oulhaca El Gheraba	Oulhaca El Gheraba	46053
2770	1039	46	سيدي ورياش	Sidi Ouriache	Sidi Ouriache	46024
2771	1040	46	سيدي بن عدة	Sidi Ben Adda	Sidi Ben Adda	46013
2772	1040	46	عين تموشنت	Ain Temouchent	Ain Temouchent	46000
2773	1041	47	ضاية بن ضحوة	Dhayet Bendhahoua	Dhayet Bendhahoua	47011
2774	1042	47	المنصورة	Mansoura	Mansoura	34008
2775	1043	47	العطف	El Atteuf	El Atteuf	47012
2776	1043	47	بونورة	Bounoura	Bounoura	47005
2777	1044	47	زلفانة	Zelfana	Zelfana	47007
2778	1045	47	القرارة	El Guerrara	El Guerrara	47004
2779	1046	47	سبسب	Sebseb	Sebseb	47025
2780	1046	47	متليلي	Metlili	Metlili	47002
2781	1047	47	بريان	Berriane	Berriane	47003
2782	1048	47	غرداية	Ghardaia	Ghardaia	47000
2783	1049	48	القطار	El-Guettar	El-Guettar	48016
2784	1049	48	مازونة	Mazouna	Mazouna	48002
2785	1050	48	أولاد يعيش	Ouled Aiche	Ouled Aiche	48019
2786	1050	48	عمي موسى	Ammi Moussa	Ammi Moussa	48004
2787	1051	48	بني درقن	Beni Dergoun	Beni Dergoun	48039
2788	1051	48	دار بن عبد الله	Dar Ben Abdelah	Dar Ben Abdelah	48044
2789	1051	48	زمورة	Zemmoura	Zemmoura	48008
2790	1052	48	جديوية	Djidiouia	Djidiouia	48005
2791	1052	48	حمري	Hamri	Hamri	48051
2792	1052	48	أولاد سيدي الميهوب	Ouled Sidi Mihoub	Ouled Sidi Mihoub	48061
2793	1053	48	بلعسل بوزقزة	Belaassel Bouzagza	Belaassel Bouzagza	48036
2794	1053	48	المطمر	El-Matmar	El-Matmar	48009
2795	1053	48	سيدي  خطاب	Sidi Khettab	Sidi Khettab	48029
2796	1053	48	سيدي امحمد بن عودة	Sidi M'hamed Benaouda	Sidi M'hamed Benaouda	48030
2797	1054	48	عين طارق	Ain-Tarek	Ain-Tarek	48015
2798	1054	48	حد الشكالة	Had Echkalla	Had Echkalla	48050
2799	1055	48	الولجة	El Ouldja	El Ouldja	19046
2800	1056	48	عين الرحمة	Ain Rahma	Ain Rahma	48033
2801	1056	48	القلعة	Kalaa	Kalaa	48018
2802	1056	48	سيدي سعادة	Sidi Saada	Sidi Saada	48067
2803	1056	48	يلل	Yellel	Yellel	48006
2804	1057	48	سوق الحد	Souk El Had	Souk El Had	\N
2805	1058	48	منداس	Mendes	Mendes	48012
2806	1058	48	وادي السلام	Oued Essalem	Oued Essalem	48022
2807	1058	48	سيدي لزرق	Sidi Lazreg	Sidi Lazreg	48065
2808	1059	48	واريزان	Ouarizane	Ouarizane	48013
2809	1059	48	مرجة سيدي عابد	Merdja Sidi Abed	Merdja Sidi Abed	48056
2810	1059	48	وادي رهيو	Oued-Rhiou	Oued-Rhiou	48001
2811	1059	48	لحلاف	Lahlef	Lahlef	48020
2812	1060	48	بن داود	Bendaoud	Bendaoud	48053
2813	1060	48	غليزان	Relizane	Relizane	48000
2814	1061	48	الحاسي	El Hassi	El Hassi	05116
2815	1062	48	سيدي أمحمد بن علي	Sidi M'hamed Benali	Sidi M'hamed Benali	48003
2816	1062	48	مديونة	Mediouna	Mediouna	48011
2817	1062	48	بني زنطيس	Beni Zentis	Beni Zentis	48041
2818	1063	48	وادي الجمعة	Oued El Djemaa	Oued El Djemaa	48021
2819	1063	48	الحمادنة	El H'madna	El H'madna	48017
2820	1064	48	الرمكة	Ramka	Ramka	48024
2821	1065	49	تنركوك	Tinerkouk	Tinerkouk	01013
2822	1065	49	قصر قدور	Ksar Kaddour	Ksar Kaddour	01035
2823	1066	49	تيميمون	Timimoun	Timimoun	01001
2824	1066	49	أولاد السعيد	Ouled Said	Ouled Said	01039
2825	1067	49	المطارفة	Metarfa	Metarfa	01033
2826	1067	49	أوقروت	Aougrout	Aougrout	01012
2827	1068	49	طالمين	Talmine	Talmine	01034
2828	1068	49	شروين	Charouine	Charouine	01014
2829	1069	49	أولاد عيسى	Ouled Aissa	Ouled Aissa	01051
2830	1070	49	دلدول	Deldoul	Deldoul	17046
2831	1071	50	تيمياوين	Timiaouine	Timiaouine	01042
2832	1071	50	برج باجي مختار	Bordj Badji Mokhtar	Bordj Badji Mokhtar	01010
2833	1072	51	رأس الميعاد	Ras El Miad	Ras El Miad	07062
2834	1072	51	بسباس	Besbes	Besbes	07044
2835	1073	51	سيدي  خالد	Sidi Khaled	Sidi Khaled	07004
2836	1074	51	الدوسن	Doucen	Doucen	07007
2837	1074	51	أولاد جلال	Ouled Djellal	Ouled Djellal	07002
2838	1075	51	الشعيبة	Chaiba	Chaiba	42047
2839	1076	52	بني عباس	Beni-Abbes	Beni-Abbes	08002
2840	1076	52	تامترت	Tamtert	Tamtert	08046
2841	1077	52	إقلي	Igli	Igli	08021
2842	1078	52	الواتة	El Ouata	El Ouata	08020
2843	1079	52	أولاد خضير	Ouled-Khodeir	Ouled-Khodeir	08028
2844	1079	52	القصابي	Ksabi	Ksabi	08039
2845	1080	52	كرزاز	Kerzaz	Kerzaz	08022
2846	1080	52	تيمودي	Timoudi	Timoudi	08031
2847	1080	52	بن يخلف	Beni-Ikhlef	Beni-Ikhlef	08025
2848	1081	53	إينغر	Inghar	Inghar	11004
2849	1082	53	عين صالح	Ain Salah	Ain Salah	11001
2850	1082	53	فقارة الزوى	Foggaret Ezzoua	Foggaret Ezzoua	11016
2851	1083	54	تين زواتين	Tin Zouatine	Tin Zouatine	11011
2852	1084	54	عين قزام	Ain Guezzam	Ain Guezzam	11005
2853	1085	55	تماسين	Temacine	Temacine	30003
2854	1085	55	بلدة اعمر	Blidet Amor	Blidet Amor	30005
2855	1086	55	سيدي سليمان	Sidi Slimane	Sidi Slimane	30030
2856	1087	55	المقارين	Megarine	Megarine	30009
2857	1088	55	النزلة	Nezla	Nezla	30004
2858	1088	55	تبسبست	Tebesbest	Tebesbest	30058
2859	1088	55	تقرت	Touggourt	Touggourt	30002
2860	1088	55	الزاوية العابدية	Zaouia El Abidia	Zaouia El Abidia	30018
2861	1089	55	الطيبات	Taibet	Taibet	30015
2862	1089	55	بن ناصر	Benaceur	Benaceur	30020
2863	1089	55	المنقر	M'naguer	M'naguer	30029
2864	1090	55	العالية	El Alia	El Alia	30023
2865	1090	55	الحجيرة	El-Hadjira	El-Hadjira	30006
2866	1091	56	جانت	Djanet	Djanet	33002
2867	1091	56	برج الحواس	Bordj El Haouass	Bordj El Haouass	33008
2868	1092	57	أم الطيور	Oum Touyour	Oum Touyour	39034
2869	1092	57	المغير	El-M'ghaier	El-M'ghaier	39005
2870	1092	57	سطيل	Still	Still	39039
2871	1092	57	سيدي خليل	Sidi Khelil	Sidi Khelil	39038
2872	1093	57	سيدي عمران	Sidi Amrane	Sidi Amrane	39021
2873	1093	57	المرارة	M'rara	M'rara	39067
2874	1093	57	جامعة	Djamaa	Djamaa	39004
2875	1093	57	تندلة	Tenedla	Tenedla	39042
2876	1094	58	المنيعة	El Meniaa	El Meniaa	47001
2877	1094	58	حاسي القارة	Hassi Gara	Hassi Gara	47006
2878	1095	58	حاسي الفحل	Hassi Fehal	Hassi Fehal	47021
2879	1096	59	البيضاء	El Beidha	El Beidha	03013
2880	1096	59	قلتة سيدي سعد	Gueltat Sidi Saad	Gueltat Sidi Saad	03025
2881	1096	59	عين سيدي علي	Ain Sidi Ali	Ain Sidi Ali	03028
2882	1097	59	بريدة	Brida	Brida	03005
2883	1097	59	الحاج مشري	Hadj Mechri	Hadj Mechri	03038
2884	1097	59	تاويالة	Taouiala	Taouiala	03026
2885	1098	59	الغيشة	El Ghicha	El Ghicha	03023
2886	1099	59	سبقاق	Sebgag	Sebgag	03034
2887	1099	59	سيدي بوزيد	Sidi Bouzid	Sidi Bouzid	03024
2888	1099	59	أفلو	Aflou	Aflou	03001
2889	1100	59	وادي مرة	Oued Morra	Oued Morra	03027
2890	1100	59	وادي مزي	Oued M'zi	Oued M'zi	03041
2891	1101	60	بريزينة	Brezina	Brezina	32002
2892	1101	60	الغاسول	Ghassoul	Ghassoul	32017
2893	1102	60	الأبيض سيدي الشيخ	Labiodh Sidi Cheikh	Labiodh Sidi Cheikh	32003
2894	1102	60	اربوات	Arbaouat	Arbaouat	32005
2895	1103	60	بوسمغون	Boussemghoun	Boussemghoun	32014
2896	1104	60	الشقيق	Cheguig	Cheguig	32022
2897	1105	60	شلالة	Chellala	Chellala	32015
2898	1106	61	سيدي الجيلالي	Sidi Djillali	Sidi Djillali	13043
2899	1106	61	البويهي	Bouihi	Bouihi	13030
2900	1107	61	القور	El Gor	El Gor	13034
2901	1107	61	العريشة	El Aricha	El Aricha	13031
2902	1108	62	جمورة	Djemorah	Djemorah	07025
2903	1108	62	برانيس	Branis	Branis	07023
2904	1109	62	الوطاية	El Outaya	El Outaya	07030
2905	1110	62	القنطرة	El Kantara	El Kantara	07008
2906	1110	62	عين زعطوط	Ain Zaatout	Ain Zaatout	07013
2907	1111	63	سقانة	Seggana	Seggana	05027
2908	1111	63	تيلاطو	Tilatou	Tilatou	05127
2909	1112	63	بريكة	Barika	Barika	05001
2910	1112	63	بيطام	Bitam	Bitam	05045
2911	1112	63	إمدوكل	M Doukal	M Doukal	05037
2912	1113	63	عزيل عبد القادر	Azil Abedelkader	Azil Abedelkader	05087
2913	1113	63	الجزار	Djezzar	Djezzar	05046
2914	1113	63	أولاد عمار	Ouled Ammar	Ouled Ammar	05121
2915	1114	64	سيدي هجرس	Sidi Hadjeres	Sidi Hadjeres	28036
2916	1115	64	بوسعادة	Bou Saada	Bou Saada	28001
2917	1115	64	الهامل	El Hamel	El Hamel	28015
2918	1115	64	ولتام	Oulteme	Oulteme	28054
2919	1116	64	بن زوه	Benzouh	Benzouh	28028
2920	1116	64	أولاد سيدي ابراهيم	Ouled Sidi Brahim	Ouled Sidi Brahim	28032
2921	1117	64	سيدي عامر	Sidi Ameur	Sidi Ameur	\N
2922	1117	64	تامسة	Tamsa	Tamsa	28065
2923	1118	64	بن سرور	Ben Srour	Ben Srour	28009
2924	1118	64	محمد بوضياف	Mohamed Boudiaf	Mohamed Boudiaf	28033
2925	1118	64	أولاد سليمان	Ouled Slimane	Ouled Slimane	28031
2926	1118	64	زرزور	Zarzour	Zarzour	28067
2927	1119	64	عين الملح	Ain El Melh	Ain El Melh	28004
2928	1119	64	عين فارس	Ain Fares	Ain Fares	28023
2929	1119	64	عين الريش	Ain Rich	Ain Rich	28025
2930	1119	64	بئر فضة	Bir Foda	Bir Foda	28043
2931	1120	64	سيدي امحمد	Sidi M'hamed	Sidi M'hamed	16002
2932	1121	64	امجدل	Medjedel	Medjedel	28016
2933	1121	64	مناعة	Menaa	Menaa	05012
2934	1122	64	سليم	Slim	Slim	28037
2935	1123	64	المعاضيد	Maadid	Maadid	28011
2936	1123	64	المطارفة	M'tarfa	M'tarfa	01033
2937	1124	64	معاريف	Maarif	Maarif	28041
2938	1125	65	فركان	Ferkane	Ferkane	12044
2939	1125	65	نقرين	Negrine	Negrine	12024
2940	1126	65	العقلة المالحة	El Ogla El Malha	El Ogla El Malha	12043
2941	1126	65	بئر العاتر	Bir-El-Ater	Bir-El-Ater	12001
2942	1127	66	أولاد هلال	Ouled Hellal	Ouled Hellal	26037
2943	1127	66	بوغار	Boghar	Boghar	26013
2944	1127	66	أولاد عنتر	Ouled Antar	Ouled Antar	26035
2945	1128	66	قصر البخاري	Ksar El Boukhari	Ksar El Boukhari	26003
2946	1128	66	مفاتحة	M'fatha	M'fatha	26049
2947	1128	66	السانق	Saneg	Saneg	26067
2948	1129	66	بوعيش	Bouaiche	Bouaiche	\N
2949	1129	66	بوغزول	Boughzoul	Boughzoul	26023
2950	1129	66	الشهبونية	Chabounia	Chabounia	26026
2951	1130	66	عين بوسيف	Ain Boucif	Ain Boucif	26005
2952	1130	66	العوينات	El Ouinet	El Ouinet	12005
2953	1130	66	الكاف الاخضر	Kef Lakhdar	Kef Lakhdar	26051
2954	1130	66	أولاد امعرف	Ouled Emaaraf	Ouled Emaaraf	26038
2955	1130	66	سيدي دامد	Sidi Demed	Sidi Demed	26069
2956	1131	66	عين اقصير	Ain Ouksir	Ain Ouksir	26048
2957	1131	66	شلالة العذاورة	Chelalet El Adhaoura	Chelalet El Adhaoura	26007
2958	1131	66	شنيقل	Cheniguel	Cheniguel	26057
2959	1131	66	تفراوت	Tafraout	Tafraout	26074
2960	1132	66	عزيز	Aziz	Aziz	26040
2961	1132	66	دراق	Derrag	Derrag	26015
2962	1132	66	أم الجليل	Oum El Djellil	Oum El Djellil	26042
2963	1133	67	قصر الشلالة	Ksar Chellala	Ksar Chellala	14002
2964	1133	67	سرغين	Serghine	Serghine	14051
2965	1133	67	زمالة  الأمير عبد القادر	Zmalet El Emir Abdelkade	Zmalet El Emir Abdelkade	14038
2966	1134	67	بوقرة	Bougara	Bougara	09008
2967	1135	67	حمادية	Hamadia	Hamadia	14020
2968	1135	67	الرشايقة	Rechaiga	Rechaiga	14026
2969	1136	68	حد الصحاري	Had Sahary	Had Sahary	17022
2970	1136	68	بويرة الأحداب	Bouira Lahdab	Bouira Lahdab	17044
2971	1136	68	عين فقه	Ain Fekka	Ain Fekka	17040
2972	1137	68	سيدي لعجال	Sidi Laadjel	Sidi Laadjel	17024
2973	1137	68	حاسي فدول	Hassi Fedoul	Hassi Fedoul	17056
2974	1137	68	الخميس	El Khemis	El Khemis	17051
2975	1138	68	بيرين	Birine	Birine	17014
2976	1138	68	بنهار	Benhar	Benhar	17043
2977	1139	68	قرنيني	Guernini	Guernini	17054
2978	1139	68	عين وسارة	Ain Oussera	Ain Oussera	17001
2979	1140	69	سلمانة	Selmana	Selmana	17063
2980	1140	69	سد الرحال	Sed Rahal	Sed Rahal	17062
2981	1140	69	مسعد	Messaad	Messaad	17003
2982	1140	69	قطارة	Guettara	Guettara	17055
2983	1140	69	دلدول	Deldoul	Deldoul	17046
2984	1141	69	أم العظام	Oum Laadham	Oum Laadham	17061
2985	1141	69	فيض البطمة	Faidh El Botma	Faidh El Botma	17021
2986	1141	69	عمورة	Amourah	Amourah	17042
\.


--
-- Data for Name: customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."customer" ("id", "full_name", "phone", "email", "nin", "nif", "si", "address", "home_wilaya_id", "home_commune_id", "gps_lat", "gps_lon", "created_at", "updated_at", "no_show_count", "flagged_at", "rating_avg", "rating_count", "referral_code", "referred_by_customer_id") FROM stdin;
052110db-14ac-49c1-af3f-b2932e5649df	Test SMTP	0770043377	plum10.dz@gmail.com	\N	\N	\N	Rue Kaidi Muhammad Bordj El Kiffan	\N	\N	\N	\N	2026-10-03 18:47:49.149966+00	2026-10-04 18:24:16.126109+00	0	\N	\N	0	REF-100338	\N
6985c0a5-83da-4e51-b527-79b22259d4f5	Karim Testeur	+213770999888	karim@test.dz	\N	\N	\N	Rue Kaidi Muhammad Bordj El Kiffan	16	1937	\N	\N	2026-10-02 21:15:23.687191+00	2026-10-04 18:34:08.720584+00	0	\N	\N	0	REF-100344	\N
f9efc20c-cde1-49d3-a16e-8ed5313df959	SMS Test	+213555000111	smstest@example.dz	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-04 21:23:13.177375+00	2026-10-04 21:23:13.177375+00	0	\N	\N	0	REF-100725	\N
47ad1b00-edd1-48ee-96db-c444877cabbd	Amine Demo	+213770000000	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-02 20:00:34.418909+00	2026-10-04 15:28:33.10686+00	0	\N	\N	0	REF-100335	\N
b464c84b-ecb3-4773-8d9e-feb614ba6e94	Lina Testeuse	+213770999777	lina@test.dz	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-02 21:18:11.067218+00	2026-10-04 15:28:33.10686+00	0	\N	\N	0	REF-100336	\N
3aa2c9e5-3c34-4658-ad82-ef3265b17ecf	achour brahim	+213770043377	achour.brahim.slimane@gmail.com	\N	\N	\N	\N	\N	\N	\N	\N	2026-10-03 18:49:45.209211+00	2026-10-04 15:28:33.10686+00	0	\N	\N	0	REF-100339	\N
\.


--
-- Data for Name: vehicle; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."vehicle" ("id", "matricule", "seats", "nif_owner", "make", "model", "notes", "created_at", "updated_at", "wheelchair_accessible", "pets_allowed", "luggage_capacity") FROM stdin;
bb180ef2-be2f-47b6-996b-18a4dc8f7a06	16-111-222-33	20	12345678901234567890	Demo	Bus	\N	2026-10-02 20:00:15.099928+00	2026-10-02 20:00:15.099928+00	f	t	\N
29919bb2-8be1-4541-93e7-1c22398769c4	098899	5	\N	GAC	gs3	\N	2026-10-03 19:04:09.159116+00	2026-10-03 19:04:09.159116+00	f	t	\N
424b2ef7-5313-45af-9154-7cf92daf1578	12345-326-19	4	\N	GAC	GS3	\N	2026-10-03 19:40:18.208392+00	2026-10-04 19:06:19.789621+00	f	f	3
\.


--
-- Data for Name: driver; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."driver" ("id", "full_name", "nin", "nif", "si", "phone", "email", "address", "created_at", "updated_at", "vehicle_id", "no_show_count", "flagged_at", "rating_avg", "rating_count") FROM stdin;
edd3a4ed-5ac9-40e7-922e-8ac13a47cb3a	Achour amrani	109911501008110009	\N	\N	0770043377	\N	\N	2026-10-03 19:03:35.230761+00	2026-10-03 19:03:35.230761+00	\N	0	\N	\N	0
7bc9aa79-404f-4421-a305-1e29110ddd58	Rachid Chauffeur	987654321098765432	\N	\N	+213661111222	\N	\N	2026-10-02 21:17:58.190462+00	2026-10-03 19:32:41.552133+00	\N	0	\N	\N	0
46146536-85db-42d6-9dd0-af396fef94ce	achour brahim	123456789012345678	\N	\N	+213555000111	ammi.said.kaidi@gmail.com	Rue Kaidi Muhammad Bordj El Kiffan	2026-10-02 20:00:12.334825+00	2026-10-03 19:40:19.544705+00	424b2ef7-5313-45af-9154-7cf92daf1578	0	\N	\N	0
eecbf068-c592-4d7c-9c2f-087e690d5199	TEST Driver 1791207377935-90	000179120737793590	\N	\N	+213637793590	\N	\N	2026-10-05 13:38:26.37672+00	2026-10-05 13:38:26.37672+00	\N	0	\N	\N	0
6fab0e6c-8341-4d30-8760-280a3335a338	TEST Driver 1791207377935-91	000179120737793591	\N	\N	+213637793591	\N	\N	2026-10-05 13:38:44.644245+00	2026-10-05 13:38:44.644245+00	\N	0	\N	\N	0
e435ebda-00d1-449c-9d3f-2cd261376f25	TEST Driver 1791207377935-92	000179120737793592	\N	\N	+213637793592	\N	\N	2026-10-05 13:38:59.523906+00	2026-10-05 13:38:59.523906+00	\N	0	\N	\N	0
1bbe154d-d023-451a-969e-533aaa1aa624	TEST Driver 1791207377935-1	000017912073779351	\N	\N	+21363779351	\N	\N	2026-10-05 13:40:02.413273+00	2026-10-05 13:40:02.413273+00	\N	0	\N	\N	0
c98067a2-599a-4adf-b51b-9e7b3f5a43eb	TEST Driver 1791207377935-2	000017912073779352	\N	\N	+21363779352	\N	\N	2026-10-05 13:41:30.600533+00	2026-10-05 13:41:43.564835+00	\N	1	\N	\N	0
4cee0a2a-df83-42da-8769-b04d8b7fb5b1	TEST Driver 1791207377935-3	000017912073779353	\N	\N	+21363779353	\N	\N	2026-10-05 13:41:50.984487+00	2026-10-05 13:41:50.984487+00	\N	0	\N	\N	0
1ff4908b-29eb-4a67-879b-dc9e362d1a86	TEST Driver 1791207377935-4	000017912073779354	\N	\N	+21363779354	\N	\N	2026-10-05 13:42:17.261342+00	2026-10-05 13:42:17.261342+00	\N	0	\N	\N	0
6ca4cb53-9cac-46e0-941f-1a0320f2b5f7	TEST Driver 1791207377935-5	000017912073779355	\N	\N	+21363779355	\N	\N	2026-10-05 13:42:51.883265+00	2026-10-05 13:43:39.610862+00	\N	0	\N	5.00	1
5933240d-ce40-44df-b43e-aa607989807c	TEST Driver 1791207377935-8	000017912073779358	\N	\N	+21363779358	\N	\N	2026-10-05 13:43:43.997133+00	2026-10-05 13:43:43.997133+00	\N	0	\N	\N	0
0a67a0a4-e91e-4329-977f-2c7cb5872a63	TEST Driver 1791207377935-10	000179120737793510	\N	\N	+213637793510	\N	\N	2026-10-05 13:44:33.334077+00	2026-10-05 13:44:33.334077+00	\N	0	\N	\N	0
6d3073d6-67e2-46b1-bda2-7b3ff65b3072	TEST Driver 1791207377935-11	000179120737793511	\N	\N	+213637793511	\N	\N	2026-10-05 13:44:56.083915+00	2026-10-05 13:44:56.083915+00	\N	0	\N	\N	0
4a3224f6-f620-4f45-ae5b-8c0ca567bc68	TEST Driver 1791207377935-12	000179120737793512	\N	\N	+213637793512	\N	\N	2026-10-05 13:46:15.302294+00	2026-10-05 13:46:15.302294+00	\N	0	\N	\N	0
20971ded-e8e5-449e-9839-ecce25d9a1fb	TEST Driver 1791207377935-13	000179120737793513	\N	\N	+213637793513	\N	\N	2026-10-05 13:46:50.323416+00	2026-10-05 13:46:50.323416+00	\N	0	\N	\N	0
ea027fca-253d-4b43-b187-7602a957c647	TEST Driver 1791207377935-14	000179120737793514	\N	\N	+213637793514	\N	\N	2026-10-05 13:47:08.84357+00	2026-10-05 13:47:08.84357+00	\N	0	\N	\N	0
869b198d-9836-415f-a1a4-c7032b6c78df	TEST Driver 1791207377935-15	000179120737793515	\N	\N	+213637793515	\N	\N	2026-10-05 13:47:56.666613+00	2026-10-05 13:47:56.666613+00	\N	0	\N	\N	0
\.


--
-- Data for Name: app_user; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."app_user" ("id", "email", "password_hash", "full_name", "phone", "role", "customer_id", "email_verified", "failed_attempts", "locked_until", "created_at", "updated_at", "driver_id", "admin_role") FROM stdin;
a8107d18-5a8e-4d88-a573-a866f4c3d0c2	plum10.dz@gmail.com	scrypt:f24f9b153d7eb6b9c60dffe1303250ca:cfb2355444dade6be9e374bb76748524750d96e4557224456e4e672638dd3925957959d85f102d59fa262d7f67cc8226cc882f1ea2aeb3b22ddc59c78f7a5cc5	Admin	0550000000	admin	052110db-14ac-49c1-af3f-b2932e5649df	t	0	\N	2026-10-03 18:47:50.743772+00	2026-10-03 18:47:50.743772+00	\N	super_admin
7b58aaaf-1746-4dba-a2b4-665f68d56387	karim@test.dz	scrypt:7737db7bae888c7026144a6a410bc0ad:4f9c95fc0171cd9ce832db1f6384633018929ec7fef3fd671e13d1ef5273013cc44c370d5c6492642a3e65e333ae2eb445a8468596ad00f349799ac1c1fbf17a	Karim Testeur	+213770999888	customer	6985c0a5-83da-4e51-b527-79b22259d4f5	t	0	\N	2026-10-02 21:15:27.440683+00	2026-10-02 21:15:27.440683+00	\N	\N
dba3791e-8bd9-4d0f-94dc-bde1dc67a213	lina@test.dz	scrypt:7141f06f48384ba489d26418200058ee:c4d1ab302de3ca56f17ea9e05f458d26d126a9bdc54ca0c9a2eb0a99ada545eaff143a9f137f3f25b6f9710f6b9940f46e6ec24dbc52199a423dc0ad2f2e3857	Lina Testeuse	+213770999777	customer	b464c84b-ecb3-4773-8d9e-feb614ba6e94	t	0	\N	2026-10-02 21:18:12.518784+00	2026-10-02 21:18:12.518784+00	\N	\N
7be40049-a06f-4a22-8fbe-a3499fbc9386	admin@wassalni.dz	scrypt:41baf67161524c4078ed13c80938e602:aa6b88d95dd1e00cbe4d8f6aa4530597c0f069001e05b6e3b8c624c566c874d757f16f0cd0507e6c9e70c2e9be0f4fc695f7ca8ab7d88fae71031eecdb99d8b3	Admin Wassalni	\N	admin	\N	t	0	\N	2026-10-02 21:14:20.493153+00	2026-10-02 21:14:20.493153+00	\N	super_admin
6f1b8c1d-3db8-450b-bb8d-792c316646f4	rachid.driver@wassalni.dz	scrypt:062c194486c4a10d888b685ebef17f6b:51e5d4bb5c775471a206ff19b1db2621a846f9d56f20e6007896658ebe12c9d9211d20089793f8cc1c092b6674ec8457f1b7075a9f319fe0ff8acc31889556c2	Rachid Chauffeur	\N	driver	\N	f	0	\N	2026-10-03 19:19:11.766042+00	2026-10-03 19:19:11.766042+00	7bc9aa79-404f-4421-a305-1e29110ddd58	\N
1c51c261-841e-41ea-96fc-7d2400be8edc	achour.brahim.slimane@gmail.com	scrypt:365d6c42f01a8a3bbcbb291073847dd2:0ad15f4573d592be1dc14976fbe6f2ac4fd27f12a235e3550ddc9c11c5d3253ad4c58e6238eea772570278dacdaa682d1000b76af62d1efb148922825dfef3d2	achour brahim	+213770043377	customer	3aa2c9e5-3c34-4658-ad82-ef3265b17ecf	t	0	\N	2026-10-03 18:49:47.833431+00	2026-10-03 18:49:47.833431+00	\N	\N
56312ce4-492b-45c5-b797-e3dcfe4c0f3c	driver@wassalni.dz	scrypt:2063d8bcaa115da9e512aecce2e7d60f:238f39ac25b5e08ba01c82f925d44b437dc17441dba442ad83d04d6a37e6cd4fe555c5727bb461abb1c50877b791912888a7bba611dd2c68755102fdf2d78a3c	Demo Driver	\N	driver	\N	t	0	\N	2026-10-02 21:47:55.979069+00	2026-10-02 21:47:55.979069+00	46146536-85db-42d6-9dd0-af396fef94ce	\N
\.


--
-- Data for Name: app_session; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."app_session" ("token_hash", "user_id", "created_at", "expires_at", "last_seen_at", "user_agent", "ip") FROM stdin;
75a07fbfa1ae98c55493ccc1097a4132963dfd8b009751f0937127d06b1047a3	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	2026-10-05 07:09:52.16782+00	2026-10-12 07:09:52.16782+00	2026-10-05 07:14:28.322471+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	127.0.0.1
22ea410e879016eae838c3def565d0e4ccf51d19f7e7a9efb498c354656f30e1	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	2026-10-03 06:55:08.81408+00	2026-10-10 06:55:08.81408+00	2026-10-03 06:55:12.795455+00	curl/8.14.1	127.0.0.1
144de66b1ac633fcca6e9b4ca4d21537c8063995876fdba8201b6311fa5e4d02	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	2026-10-03 08:50:25.618717+00	2026-10-10 08:50:25.618717+00	2026-10-03 08:50:31.957868+00	curl/8.14.1	127.0.0.1
155f2f0e2f47527cf11be6bcd7bf30a87aed54de941c5c434b68c6d942622d17	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	2026-10-03 08:55:33.07791+00	2026-10-10 08:55:33.07791+00	2026-10-03 08:55:33.07791+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.12.0.16
3ba7ee83b63cc5acd41eef0d86eb1d99a6cde7e9bca49e9b16a283e43fcd580e	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	2026-10-03 09:31:11.359882+00	2026-10-10 09:31:11.359882+00	2026-10-03 09:31:11.359882+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.12.0.36
84cf3593f1d7b1cd82df0270e46a1fc5a408a77880a4f6a08b787b1da6176ccc	7be40049-a06f-4a22-8fbe-a3499fbc9386	2026-10-03 09:32:43.198674+00	2026-10-10 09:32:43.198674+00	2026-10-03 09:32:43.198674+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.12.0.36
e1ff55a7fffc4ad7539de7edba18eb713137f216bf03c7296da0cbf93de42d69	7be40049-a06f-4a22-8fbe-a3499fbc9386	2026-10-03 18:01:47.061055+00	2026-10-10 18:01:47.061055+00	2026-10-03 18:01:55.135316+00	curl/8.14.1	127.0.0.1
bda6359fd0e1a76ab7010730d315a1e2be672e8be5764087123bfa34d7a389f0	7be40049-a06f-4a22-8fbe-a3499fbc9386	2026-10-03 09:33:21.185786+00	2026-10-10 09:33:21.185786+00	2026-10-03 09:33:21.185786+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	10.12.0.36
b7987fa9bfec7cc8289be68f43708418894eb0c96e7a697928566f9ad2beae5a	7be40049-a06f-4a22-8fbe-a3499fbc9386	2026-10-03 18:10:03.957102+00	2026-10-10 18:10:03.957102+00	2026-10-03 18:10:03.957102+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	127.0.0.1
0336da53377077cc696ac67f699c13e1d7059a4022ed4be3bb8b368bf01f187d	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	2026-10-03 18:11:52.772817+00	2026-10-10 18:11:52.772817+00	2026-10-03 18:11:52.772817+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	127.0.0.1
64c560309c7593ff5904cf56ec8617d303e53d6328397cb67bea854171732e27	1c51c261-841e-41ea-96fc-7d2400be8edc	2026-10-03 18:50:24.296371+00	2026-10-10 18:50:24.296371+00	2026-10-03 18:50:24.296371+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	127.0.0.1
a8e8f906ac9464cb1996d5cf51510d3ee8cfb442067eafa8683a9428a7d1b0e6	1c51c261-841e-41ea-96fc-7d2400be8edc	2026-10-03 18:51:32.34243+00	2026-10-10 18:51:32.34243+00	2026-10-03 18:51:32.34243+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	127.0.0.1
1298c6e37a4ee199ab4b8754c4986ab18702dcfe5048e2676d326d43a8647ac7	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	2026-10-04 19:33:20.190992+00	2026-10-11 19:33:20.190992+00	2026-10-04 19:38:12.173452+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	127.0.0.1
b200894880cee6a325fae1fd0eb5ae36b2b95bcb1dd915d4900984fc3279eb89	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	2026-10-05 14:13:23.119047+00	2026-10-12 14:13:23.119047+00	2026-10-05 14:16:36.474405+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	127.0.0.1
c0550bf7c96af0db9c8af0273e4b5cdfa7c5f6ebd6fd6625fc2f00c799dbced0	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	2026-10-02 22:50:21.599769+00	2026-10-09 22:50:21.599769+00	2026-10-02 22:50:21.599769+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	127.0.0.1
4d5aa790983e803c7f51011e61298d22811c71b69af01f4022bf22400471f7f7	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	2026-10-02 22:52:00.70126+00	2026-10-09 22:52:00.70126+00	2026-10-02 22:52:00.70126+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	127.0.0.1
c62c872b70d263d7355f8ee99de87ec38fd8700480393c274ee358066f74adfa	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	2026-10-03 05:59:50.56754+00	2026-10-10 05:59:50.56754+00	2026-10-03 05:59:50.56754+00	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36	127.0.0.1
87e06f99886933059f9e5bb70adea852ea26f19004c8fe8f2aab20c1ca94b7bb	7be40049-a06f-4a22-8fbe-a3499fbc9386	2026-10-03 17:54:00.638994+00	2026-10-10 17:54:00.638994+00	2026-10-03 17:55:46.941232+00	curl/8.14.1	127.0.0.1
\.


--
-- Data for Name: app_setting; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."app_setting" ("key", "value", "updated_at") FROM stdin;
platform_commission_pct	15	2026-10-04 15:14:49.95885+00
refund_policy_full_hours	24	2026-10-04 15:15:09.716848+00
refund_policy_partial_hours	2	2026-10-04 15:15:09.716848+00
refund_policy_partial_pct	50	2026-10-04 15:15:09.716848+00
referral_reward_amount	200	2026-10-04 15:28:33.10686+00
pricing_peak_multiplier	1.15	2026-10-04 15:28:33.10686+00
pricing_offpeak_multiplier	0.9	2026-10-04 15:28:33.10686+00
pricing_early_booking_days	7	2026-10-04 15:28:33.10686+00
pricing_early_booking_multiplier	0.92	2026-10-04 15:28:33.10686+00
pricing_high_demand_occupancy_pct	70	2026-10-04 15:28:33.10686+00
pricing_high_demand_multiplier	1.2	2026-10-04 15:28:33.10686+00
pricing_low_demand_occupancy_pct	20	2026-10-04 15:28:33.10686+00
pricing_low_demand_multiplier	0.9	2026-10-04 15:28:33.10686+00
trip_scheduler_grace_minutes	30	2026-10-04 18:36:35.698338+00
trip_scheduler_autoclose_grace_minutes	120	2026-10-04 18:36:35.698338+00
trip_reminder_lead_minutes	60	2026-10-04 18:36:35.698338+00
message_rate_limit_per_5min	20	2026-10-04 18:36:35.698338+00
sos_rate_limit_per_hour	3	2026-10-04 18:36:35.698338+00
trip_reminder_24h_lead_minutes	1440	2026-10-04 19:39:24.754885+00
no_show_strike_threshold	3	2026-10-05 13:48:40.518+00
\.


--
-- Data for Name: app_user_otp; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."app_user_otp" ("id", "user_id", "purpose", "salt", "code_hash", "expires_at", "consumed_at", "attempts", "created_at", "channel") FROM stdin;
ec925864-1244-4ac0-a3ed-fd76fd6de717	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	login_2fa	d3d1381f9ca97cf6	360955438b8b01a94ca1e2e7fe7c240ac192a2fd9075aba79db644d9645e4214	2026-10-05 07:19:24.050279+00	2026-10-05 07:09:49.630024+00	0	2026-10-05 07:09:24.050279+00	email
0a02be9e-020e-4386-8afd-87e07c2e3d92	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	login_2fa	676fb79f00c82cfa	55d731a21d6ef48168af065bb5dc7d49383040aa2303a99aab9e3e8be4f4b6c5	2026-10-05 14:22:28.374036+00	2026-10-05 14:13:19.830909+00	0	2026-10-05 14:12:28.374036+00	email
1721bcfb-d234-480a-8aae-a475af3efa81	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	login_2fa	51d6a190c7cbd8bf	7e2dbd54b2588c2fec8188bd0c640d77064075c8aed514fd6912603e951bfa69	2026-10-04 19:42:57.926764+00	2026-10-04 19:33:17.434084+00	0	2026-10-04 19:32:57.926764+00	email
40f8a237-6c51-420d-ab10-f9cbf3774c58	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	login_2fa	54a215cd307def54	d5672b5951b58400553f256e8b74498ebd6112608470252c9e72b83ded178484	2026-10-04 18:44:46.911206+00	2026-10-04 18:35:09.136276+00	0	2026-10-04 18:34:46.911206+00	email
4aa66306-923a-474a-890c-25be685e8549	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	login_2fa	01788f88ab3a120f	b00b3c4716ae22ec2cd0f2cb6b7ef762b50f159d2c1add2479e3dabb2e86b967	2026-10-04 15:42:48.474435+00	2026-10-04 17:55:21.707111+00	0	2026-10-04 15:32:48.474435+00	email
04f6c420-7010-437b-a733-7a8a9a944393	7b58aaaf-1746-4dba-a2b4-665f68d56387	login_2fa	2c1a27e31ee107c9	e12a3e26b1e0872997a1e1a8232ccbe816c68d09d6d22f47a8aeaa8c6a1950f2	2026-10-04 18:28:11.831162+00	2026-10-04 18:18:52.908261+00	0	2026-10-04 18:18:11.831162+00	email
dd5b87ee-3a3b-4508-8290-7701780e840e	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	login_2fa	devsalt	7b503d640ae62c45301f0b7cfd8e21c5dfa52d7d7d632f08d4030b9f99e5c265	2026-10-04 18:05:23.03267+00	2026-10-04 17:55:34.072929+00	0	2026-10-04 17:55:23.03267+00	email
e465b42a-0f81-405a-9e58-7961817fb5e6	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	login_2fa	304995970d8024b5	c5bb67cd44bfec5289e2003c498a18c62a08bb4844337e445096888d96475d5a	2026-10-04 18:30:23.45314+00	2026-10-04 18:20:42.263106+00	0	2026-10-04 18:20:23.45314+00	email
1597246e-cbe3-4418-8900-51b7645625ca	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	login_2fa	8663923816c415b6	54bc24df741c7b701955ddd6717ea366f49474ece4156820b4e8e29d7a4382b3	2026-10-04 18:32:31.800992+00	2026-10-04 18:22:49.480365+00	0	2026-10-04 18:22:31.800992+00	email
1f9f00e4-7703-43ae-acbf-5792573501a3	7b58aaaf-1746-4dba-a2b4-665f68d56387	login_2fa	ca5cbbcd84c1f4e8	3b2606f7b89bdc7163636b4db135daf2c5cedb559f50b03348cb4d8ef8847769	2026-10-04 18:41:38.357962+00	2026-10-04 18:32:05.630544+00	0	2026-10-04 18:31:38.357962+00	email
8a521ef1-fb04-4ea6-976b-93d34cce2331	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	login_2fa	691b7eb53b6e4216	435e378772ffdf75eb620968c607b3f3531d6cf48b24168b1303d20bf35e9af1	2026-10-04 19:18:43.515238+00	2026-10-04 19:08:57.606365+00	0	2026-10-04 19:08:43.515238+00	email
bb4d1797-5c1d-49e8-afe5-8bb1253021a9	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	login_2fa	80570a2775495d6f	16c4f2214647d7246901527c1242ef9ea68a41b0c1907c01122bee6f411f8519	2026-10-04 19:23:37.073763+00	2026-10-04 19:14:02.301395+00	0	2026-10-04 19:13:37.073763+00	email
\.


--
-- Data for Name: trajectory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."trajectory" ("id", "name", "created_at", "updated_at", "price_multiplier") FROM stdin;
1ff60fe5-d00e-44a2-ae20-8da995235d22	Démo Alger-Oran	2026-10-02 20:00:17.474293+00	2026-10-02 20:00:17.474293+00	1.00
2c7ee85d-98fa-4b86-9520-57a0d08ecf93	Alger-Ghardaïa	2026-10-03 19:36:09.989336+00	2026-10-03 19:36:11.923047+00	1.00
a1be3c4c-2a52-448f-b732-ff790224fb3c	471967	2026-10-03 20:58:37.38903+00	2026-10-03 20:58:37.38903+00	1.00
e564d087-d855-44b0-9aa6-1ba2324e3cad	TEST-WP-1791207377935	2026-10-05 13:36:27.534764+00	2026-10-05 13:36:27.534764+00	1.00
\.


--
-- Data for Name: recurring_trip_template; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."recurring_trip_template" ("id", "trajectory_id", "driver_id", "vehicle_id", "weekdays", "departure_time", "capacity", "seat_price", "starts_on", "ends_on", "horizon_days", "active", "notes", "created_by", "created_at", "updated_at", "last_generated_through") FROM stdin;
d1cbd92b-9863-4659-91a9-f8ef34a5e420	1ff60fe5-d00e-44a2-ae20-8da995235d22	46146536-85db-42d6-9dd0-af396fef94ce	\N	{1,3,5}	07:00:00	10	500.00	2026-10-04	\N	10	f	\N	\N	2026-10-04 18:39:22.038206+00	2026-10-04 18:39:27.464295+00	2026-10-14
\.


--
-- Data for Name: trip; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."trip" ("id", "code", "trajectory_id", "status", "published_at", "departure_at", "arrival_eta", "capacity", "seat_price", "currency", "driver_id", "vehicle_id", "notes", "created_at", "updated_at", "reminder_sent_at", "recurring_template_id", "recurring_date", "reminder_24h_sent_at") FROM stdin;
24377111-e9e7-405f-9d6d-9141269a5fc0	TRP-202610-100012	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	cancelled	2026-10-03 19:39:35.399829+00	2026-10-04 17:30:00+00	\N	4	2300.00	DZD	46146536-85db-42d6-9dd0-af396fef94ce	\N	\N	2026-10-03 19:39:15.697048+00	2026-10-04 18:35:45.800864+00	\N	\N	\N	\N
c3055795-a9d4-448f-8518-50c59e85dab1	TRP-202610-100022	a1be3c4c-2a52-448f-b732-ff790224fb3c	in_progress	\N	2026-10-05 21:31:00+00	\N	4	0.00	DZD	46146536-85db-42d6-9dd0-af396fef94ce	424b2ef7-5313-45af-9154-7cf92daf1578	\N	2026-10-03 21:31:26.753448+00	2026-10-04 12:49:56.874774+00	\N	\N	\N	\N
2add1559-7a59-48f1-9daa-1692188af6e6	TRP-202610-101216	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	scheduled	\N	2026-11-05 14:14:00+00	\N	4	0.00	DZD	46146536-85db-42d6-9dd0-af396fef94ce	424b2ef7-5313-45af-9154-7cf92daf1578	\N	2026-10-05 14:15:07.009884+00	2026-10-05 14:15:07.009884+00	\N	\N	\N	\N
8e0c8db7-735a-46a4-9268-fe0b50c8041c	TRP-202610-100001	1ff60fe5-d00e-44a2-ae20-8da995235d22	completed	2026-10-02 20:00:31.381769+00	2026-10-03 20:00:25.472+00	2026-10-04 00:30:00+00	20	0.00	DZD	46146536-85db-42d6-9dd0-af396fef94ce	bb180ef2-be2f-47b6-996b-18a4dc8f7a06	Départ à l'heure, arrêt café 10 min à Relais	2026-10-02 20:00:27.71238+00	2026-10-03 19:19:05.705399+00	\N	\N	\N	\N
3bccde4f-05f6-416a-a810-aa89c1a4ddaf	TRP-202610-100715	1ff60fe5-d00e-44a2-ae20-8da995235d22	cancelled	2026-10-04 18:39:23.426627+00	2026-10-05 07:00:00+00	\N	10	500.00	DZD	46146536-85db-42d6-9dd0-af396fef94ce	\N	Généré depuis le modèle récurrent	2026-10-04 18:39:23.426627+00	2026-10-04 18:39:27.464295+00	\N	d1cbd92b-9863-4659-91a9-f8ef34a5e420	2026-10-05	\N
4aca8903-f346-4717-8f43-02d95ac2bf68	TRP-202610-100716	1ff60fe5-d00e-44a2-ae20-8da995235d22	cancelled	2026-10-04 18:39:23.426627+00	2026-10-07 07:00:00+00	\N	10	500.00	DZD	46146536-85db-42d6-9dd0-af396fef94ce	\N	Généré depuis le modèle récurrent	2026-10-04 18:39:23.426627+00	2026-10-04 18:39:27.464295+00	\N	d1cbd92b-9863-4659-91a9-f8ef34a5e420	2026-10-07	\N
5891e185-05a6-42ab-bcde-ba6126cd819d	TRP-202610-100717	1ff60fe5-d00e-44a2-ae20-8da995235d22	cancelled	2026-10-04 18:39:23.426627+00	2026-10-09 07:00:00+00	\N	10	500.00	DZD	46146536-85db-42d6-9dd0-af396fef94ce	\N	Généré depuis le modèle récurrent	2026-10-04 18:39:23.426627+00	2026-10-04 18:39:27.464295+00	\N	d1cbd92b-9863-4659-91a9-f8ef34a5e420	2026-10-09	\N
713c51d0-d69f-4263-a1f0-152b7e1afb7a	TRP-202610-100718	1ff60fe5-d00e-44a2-ae20-8da995235d22	cancelled	2026-10-04 18:39:23.426627+00	2026-10-12 07:00:00+00	\N	10	500.00	DZD	46146536-85db-42d6-9dd0-af396fef94ce	\N	Généré depuis le modèle récurrent	2026-10-04 18:39:23.426627+00	2026-10-04 18:39:27.464295+00	\N	d1cbd92b-9863-4659-91a9-f8ef34a5e420	2026-10-12	\N
26250ac8-e532-4ac4-813e-15e4758e706d	TRP-202610-100719	1ff60fe5-d00e-44a2-ae20-8da995235d22	cancelled	2026-10-04 18:39:23.426627+00	2026-10-14 07:00:00+00	\N	10	500.00	DZD	46146536-85db-42d6-9dd0-af396fef94ce	\N	Généré depuis le modèle récurrent	2026-10-04 18:39:23.426627+00	2026-10-04 18:39:27.464295+00	\N	d1cbd92b-9863-4659-91a9-f8ef34a5e420	2026-10-14	\N
5aa4485e-c7bf-4e14-8b6f-f5fdc61481a3	TRP-202610-100720	1ff60fe5-d00e-44a2-ae20-8da995235d22	scheduled	2026-10-04 18:40:00.426006+00	2026-10-09 18:40:08.399094+00	\N	10	500.00	DZD	edd3a4ed-5ac9-40e7-922e-8ac13a47cb3a	\N	smoke test	2026-10-04 18:39:56.403371+00	2026-10-04 18:40:08.399094+00	\N	\N	\N	\N
aaa0be8e-cf8c-4a9a-bcb3-e63f815ed6e7	TRP-202610-100714	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	scheduled	\N	2026-10-05 18:57:09.053+00	\N	4	2500.00	DZD	46146536-85db-42d6-9dd0-af396fef94ce	424b2ef7-5313-45af-9154-7cf92daf1578	\N	2026-10-04 18:37:22.012087+00	2026-10-04 18:57:11.670368+00	\N	\N	\N	\N
7e2fa372-ab35-4dc8-86af-f7bb40d2c2fb	TRP-202610-100722	1ff60fe5-d00e-44a2-ae20-8da995235d22	scheduled	\N	2026-10-12 07:00:00+00	\N	10	500.00	DZD	\N	\N	Généré depuis le modèle récurrent	2026-10-04 19:16:48.831885+00	2026-10-04 19:17:00.604709+00	\N	\N	2026-10-12	\N
b70bde5c-fe9b-4044-9f98-25a35d246341	TRP-202610-100723	1ff60fe5-d00e-44a2-ae20-8da995235d22	scheduled	\N	2026-10-14 07:00:00+00	\N	10	500.00	DZD	\N	\N	Généré depuis le modèle récurrent	2026-10-04 19:16:48.831885+00	2026-10-04 19:17:00.604709+00	\N	\N	2026-10-14	\N
2d47e28b-69d9-4700-9602-83ceee458afd	TRP-202610-100724	1ff60fe5-d00e-44a2-ae20-8da995235d22	scheduled	\N	2026-10-16 07:00:00+00	\N	10	500.00	DZD	\N	\N	Généré depuis le modèle récurrent	2026-10-04 19:16:48.831885+00	2026-10-04 19:17:00.604709+00	\N	\N	2026-10-16	\N
\.


--
-- Data for Name: wpoint; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."wpoint" ("id", "trajectory_id", "wilaya_id", "position", "created_at") FROM stdin;
bd275fa3-6ef3-47c8-9b09-9d8d8b254287	1ff60fe5-d00e-44a2-ae20-8da995235d22	16	1	2026-10-02 20:00:19.792978+00
411663d0-a8ad-4931-96b2-a1813e033ba9	1ff60fe5-d00e-44a2-ae20-8da995235d22	31	2	2026-10-02 20:00:22.51142+00
7929afdd-3d86-4e84-8f57-e404dc282a9b	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	16	1	2026-10-03 19:36:41.077395+00
96245ba9-b871-48c9-bdc2-4b64cd5a7f84	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	3	2	2026-10-03 19:37:15.604351+00
82b9d1cf-5df2-4748-95e2-79e5e5650375	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	17	3	2026-10-03 19:37:30.186043+00
784205d9-89fc-4fb6-9608-93d7fff800be	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	47	4	2026-10-03 19:37:52.655859+00
e6a38cbe-ad08-43e1-8b12-9b059009171e	a1be3c4c-2a52-448f-b732-ff790224fb3c	16	1	2026-10-03 20:59:08.271743+00
15377f9a-ba4e-4b29-a9d4-0ee24fdb7d0a	a1be3c4c-2a52-448f-b732-ff790224fb3c	17	2	2026-10-03 21:26:23.704867+00
5aa06e3a-4d66-4b12-8c8f-02063ae802ee	a1be3c4c-2a52-448f-b732-ff790224fb3c	47	3	2026-10-03 21:28:55.48602+00
76f12168-9b9e-4c53-a389-bbbb6b8850d2	e564d087-d855-44b0-9aa6-1ba2324e3cad	17	1	2026-10-05 13:36:31.587288+00
67a0e0df-6401-42d6-8e95-7f287eb50c87	e564d087-d855-44b0-9aa6-1ba2324e3cad	16	2	2026-10-05 13:36:28.842085+00
912e1307-c34f-4999-9515-8229917cbe64	e564d087-d855-44b0-9aa6-1ba2324e3cad	9	3	2026-10-05 13:36:30.218484+00
\.


--
-- Data for Name: reservation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."reservation" ("id", "code", "trip_id", "trajectory_id", "customer_id", "seats", "pickup_wpoint_id", "dropoff_wpoint_id", "status", "total_price", "currency", "notes", "created_at", "updated_at", "pickup_lat", "pickup_lon", "dropoff_lat", "dropoff_lon", "pickup_commune_id", "dropoff_commune_id", "needs_wheelchair", "has_pet", "luggage_count", "special_requirements") FROM stdin;
25a1bfd8-df98-4a39-a665-2e7542f632b3	RES-202610-100008	8e0c8db7-735a-46a4-9268-fe0b50c8041c	1ff60fe5-d00e-44a2-ae20-8da995235d22	3aa2c9e5-3c34-4658-ad82-ef3265b17ecf	1	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	cancelled	2500.00	DZD	\N	2026-10-03 18:58:43.727833+00	2026-10-03 18:58:43.727833+00	\N	\N	\N	\N	\N	\N	f	f	0	\N
a8914abf-a306-492c-9375-a156fbbc694c	RES-202610-100002	8e0c8db7-735a-46a4-9268-fe0b50c8041c	1ff60fe5-d00e-44a2-ae20-8da995235d22	47ad1b00-edd1-48ee-96db-c444877cabbd	2	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	cancelled	5000.00	DZD	\N	2026-10-02 20:00:35.767085+00	2026-10-02 20:00:35.767085+00	\N	\N	\N	\N	\N	\N	f	f	0	\N
d88831aa-16b3-4c5a-9277-207ec0b7cdcf	RES-202610-100020	24377111-e9e7-405f-9d6d-9141269a5fc0	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	6985c0a5-83da-4e51-b527-79b22259d4f5	1	7929afdd-3d86-4e84-8f57-e404dc282a9b	784205d9-89fc-4fb6-9608-93d7fff800be	cancelled	2300.00	DZD	\N	2026-10-03 20:57:01.251902+00	2026-10-03 20:57:01.251902+00	\N	\N	\N	\N	\N	\N	f	f	0	\N
385be1bd-4b2f-4eb9-ac8d-7ad14778c6bd	RES-202610-100009	8e0c8db7-735a-46a4-9268-fe0b50c8041c	1ff60fe5-d00e-44a2-ae20-8da995235d22	3aa2c9e5-3c34-4658-ad82-ef3265b17ecf	1	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	cancelled	2500.00	DZD	\N	2026-10-03 18:58:47.340475+00	2026-10-03 18:58:47.340475+00	\N	\N	\N	\N	\N	\N	f	f	0	\N
82758c6c-5522-406e-9723-86cc66d8ad46	RES-202610-100021	24377111-e9e7-405f-9d6d-9141269a5fc0	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	6985c0a5-83da-4e51-b527-79b22259d4f5	1	7929afdd-3d86-4e84-8f57-e404dc282a9b	784205d9-89fc-4fb6-9608-93d7fff800be	cancelled	2300.00	DZD	\N	2026-10-03 20:57:02.565876+00	2026-10-03 20:57:02.565876+00	\N	\N	\N	\N	\N	\N	t	f	2	\N
eb143532-030e-4913-9d1c-c082bd34ce0d	RES-202610-100016	24377111-e9e7-405f-9d6d-9141269a5fc0	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	6985c0a5-83da-4e51-b527-79b22259d4f5	1	7929afdd-3d86-4e84-8f57-e404dc282a9b	82b9d1cf-5df2-4748-95e2-79e5e5650375	cancelled	1500.00	DZD	\N	2026-10-03 20:11:59.846871+00	2026-10-03 20:11:59.846871+00	36.496119	3.120165	34.582038	3.257910	\N	\N	t	f	2	\N
\.


--
-- Data for Name: contact_reveal_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."contact_reveal_log" ("id", "reservation_id", "requester_role", "requester_id", "revealed_phone", "created_at") FROM stdin;
aa8a115e-0377-490e-bfa8-a144b1feed60	25a1bfd8-df98-4a39-a665-2e7542f632b3	customer	3aa2c9e5-3c34-4658-ad82-ef3265b17ecf	+213555000111	2026-10-04 18:39:36.762565+00
b3afca96-95fe-47f4-9cc3-a3cff0620db4	82758c6c-5522-406e-9723-86cc66d8ad46	customer	6985c0a5-83da-4e51-b527-79b22259d4f5	+213555000111	2026-10-04 18:54:14.340199+00
dfd27409-56f1-4311-abd8-6e9265cb3336	82758c6c-5522-406e-9723-86cc66d8ad46	driver	46146536-85db-42d6-9dd0-af396fef94ce	+213770999888	2026-10-04 18:54:18.378216+00
75a1336a-4261-4bba-98a9-75b6343dec4e	eb143532-030e-4913-9d1c-c082bd34ce0d	customer	6985c0a5-83da-4e51-b527-79b22259d4f5	+213555000111	2026-10-04 18:55:54.153505+00
63dbec1e-5e7a-4688-af17-a356e410170d	eb143532-030e-4913-9d1c-c082bd34ce0d	driver	46146536-85db-42d6-9dd0-af396fef94ce	+213770999888	2026-10-04 18:55:58.02744+00
\.


--
-- Data for Name: conversation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."conversation" ("id", "reservation_id", "blocked_at", "created_at") FROM stdin;
80a48746-1957-4a79-a624-d6a821b8192a	25a1bfd8-df98-4a39-a665-2e7542f632b3	\N	2026-10-04 18:38:59.072612+00
362a6fc2-241c-4441-b1af-3cce2170389f	82758c6c-5522-406e-9723-86cc66d8ad46	\N	2026-10-04 18:53:48.095605+00
07cd1335-dd6a-41b2-835f-1ba0c4bd0e95	eb143532-030e-4913-9d1c-c082bd34ce0d	\N	2026-10-04 18:55:21.185463+00
\.


--
-- Data for Name: default_trip_price; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."default_trip_price" ("trajectory_id", "from_wpoint_id", "to_wpoint_id", "currency", "price", "min_price", "max_price", "notes", "created_at", "updated_at") FROM stdin;
1ff60fe5-d00e-44a2-ae20-8da995235d22	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	DZD	2500.00	\N	\N	\N	2026-10-02 20:00:25.2847+00	2026-10-02 20:00:25.2847+00
2c7ee85d-98fa-4b86-9520-57a0d08ecf93	7929afdd-3d86-4e84-8f57-e404dc282a9b	784205d9-89fc-4fb6-9608-93d7fff800be	DZD	2300.00	\N	\N	\N	2026-10-03 19:38:15.164116+00	2026-10-03 19:38:22.376859+00
2c7ee85d-98fa-4b86-9520-57a0d08ecf93	7929afdd-3d86-4e84-8f57-e404dc282a9b	82b9d1cf-5df2-4748-95e2-79e5e5650375	DZD	1500.00	\N	\N	\N	2026-10-03 19:38:37.907205+00	2026-10-03 19:38:37.907205+00
2c7ee85d-98fa-4b86-9520-57a0d08ecf93	7929afdd-3d86-4e84-8f57-e404dc282a9b	96245ba9-b871-48c9-bdc2-4b64cd5a7f84	DZD	1900.00	\N	\N	\N	2026-10-03 19:38:47.378043+00	2026-10-03 19:38:47.378043+00
a1be3c4c-2a52-448f-b732-ff790224fb3c	e6a38cbe-ad08-43e1-8b12-9b059009171e	5aa06e3a-4d66-4b12-8c8f-02063ae802ee	DZD	2300.00	\N	\N	\N	2026-10-03 21:31:13.804409+00	2026-10-03 21:31:13.804409+00
\.


--
-- Data for Name: driver_last_location; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."driver_last_location" ("driver_id", "gps_lat", "gps_lon", "recorded_at") FROM stdin;
46146536-85db-42d6-9dd0-af396fef94ce	36.750000	3.060000	2026-10-03 19:18:52.293+00
1bbe154d-d023-451a-969e-533aaa1aa624	36.750000	3.060000	2026-10-05 13:00:25.238374+00
\.


--
-- Data for Name: emergency_contact; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."emergency_contact" ("id", "customer_id", "full_name", "phone", "relationship", "created_at") FROM stdin;
\.


--
-- Data for Name: favorite_driver; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."favorite_driver" ("id", "customer_id", "driver_id", "notify", "created_at") FROM stdin;
\.


--
-- Data for Name: favorite_route; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."favorite_route" ("id", "customer_id", "origin_wpoint_id", "destination_wpoint_id", "notify", "created_at") FROM stdin;
\.


--
-- Data for Name: import_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."import_log" ("id", "ran_at", "nb_wilayas", "nb_dairas", "nb_communes", "payload_bytes", "success", "error_details") FROM stdin;
1	2026-10-02 19:59:49.138998+00	69	591	1541	233615	t	\N
\.


--
-- Data for Name: kyc_document; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."kyc_document" ("id", "driver_id", "doc_type", "file_path", "file_name", "mime_type", "status", "rejection_reason", "reviewed_by", "reviewed_at", "submitted_at", "updated_at") FROM stdin;
ad7a624e-c303-48fe-baab-b1413800c345	4cee0a2a-df83-42da-8769-b04d8b7fb5b1	identity	/tmp/test-identity.jpg	identity.jpg	image/jpeg	approved	\N	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	2026-10-05 13:41:57.798137+00	2026-10-05 13:41:54.92709+00	2026-10-05 13:41:57.798137+00
5b478d50-dc7f-40f1-bc8c-6540fd555085	4cee0a2a-df83-42da-8769-b04d8b7fb5b1	license	/tmp/test-license.jpg	license.jpg	image/jpeg	rejected	Document illisible	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	2026-10-05 13:42:07.253613+00	2026-10-05 13:42:05.56178+00	2026-10-05 13:42:07.253613+00
2f46f1f6-1879-4fce-a6d6-8ddd99461ae9	4cee0a2a-df83-42da-8769-b04d8b7fb5b1	insurance	/tmp/test-insurance.jpg	insurance.jpg	image/jpeg	pending	\N	\N	\N	2026-10-05 13:42:10.316961+00	2026-10-05 13:42:10.316961+00
e28f2c8a-91b9-4c77-9f81-ec82143a4be7	46146536-85db-42d6-9dd0-af396fef94ce	identity	/home/user/wassalni/backend/uploads/kyc/46146536-85db-42d6-9dd0-af396fef94ce/1791118145140-a52c010b-619b-4631-b0f3-a94cdee4a270.jpg	ID recto .jpg	image/jpeg	approved	\N	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	2026-10-04 18:28:18.309761+00	2026-10-04 12:49:06.429225+00	2026-10-04 18:28:18.309761+00
\.


--
-- Data for Name: message; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."message" ("id", "conversation_id", "sender_role", "sender_id", "body", "read_at", "created_at") FROM stdin;
47f9d6c2-815e-405b-8808-49499421eeb5	80a48746-1957-4a79-a624-d6a821b8192a	customer	3aa2c9e5-3c34-4658-ad82-ef3265b17ecf	Bonjour!	\N	2026-10-04 18:39:00.436999+00
87f0d2df-661e-43c2-a0f3-215a832d1a83	362a6fc2-241c-4441-b1af-3cce2170389f	customer	6985c0a5-83da-4e51-b527-79b22259d4f5	Bonjour, je serai à l’arrêt à l’heure.	\N	2026-10-04 18:53:54.800577+00
25277671-c734-4cbc-b835-b19f8835c1ad	362a6fc2-241c-4441-b1af-3cce2170389f	driver	46146536-85db-42d6-9dd0-af396fef94ce	Bien reçu, à tout à l’heure.	\N	2026-10-04 18:54:05.254068+00
7af3a5ff-adea-481a-bd1c-6b398fc67c5a	07cd1335-dd6a-41b2-835f-1ba0c4bd0e95	customer	6985c0a5-83da-4e51-b527-79b22259d4f5	Bonjour, je serai à l’arrêt à l’heure.	\N	2026-10-04 18:55:29.312921+00
6e399acb-4866-44c9-91ff-ed759477ea0c	07cd1335-dd6a-41b2-835f-1ba0c4bd0e95	driver	46146536-85db-42d6-9dd0-af396fef94ce	Bien reçu, à tout à l’heure.	\N	2026-10-04 18:55:44.938648+00
\.


--
-- Data for Name: no_show_event; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."no_show_event" ("id", "trip_id", "reservation_id", "customer_id", "driver_id", "kind", "notes", "recorded_at") FROM stdin;
6eba3a05-40f1-4578-ae62-d1d6794cd039	\N	\N	\N	c98067a2-599a-4adf-b51b-9e7b3f5a43eb	driver	test note	2026-10-05 13:41:43.564835+00
\.


--
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."notification" ("id", "recipient_user_id", "type", "title", "body", "data", "read_at", "created_at", "pushed_at", "sms_sent_at") FROM stdin;
07630b66-8efb-4be6-84ab-a2dd27970cc9	e9fb6a6e-ae7e-435e-b982-9435460a074d	reservation_cancelled	Réservation annulée	Votre réservation RES-202610-101087 a été annulée.	{"trip_id": "f7b94306-9a95-4f09-895c-63dfba351f75", "reservation_id": "faf3172b-bded-40f3-8a11-c4f0e014e92e"}	\N	2026-10-05 08:40:41.887105+00	2026-10-05 08:41:03.570931+00	2026-10-05 08:41:03.595979+00
d1777693-f5b1-4a49-b640-1f81a8e873e9	b678e16b-1c9c-4dee-82ee-6ed88d1db99c	reservation_cancelled	Réservation annulée	Votre réservation RES-202610-101142 a été annulée.	{"trip_id": "374a08ea-516b-452c-8189-e4db9ff63b1c", "reservation_id": "27eb4e19-deec-4fdb-a4b3-57acc9a72b9a"}	2026-10-05 13:43:32.85816+00	2026-10-05 13:43:14.014901+00	2026-10-05 13:43:18.840022+00	2026-10-05 13:43:19.060657+00
ffd1fe2f-72fd-4ddf-aab7-5ca0862716a6	85f97463-c727-4d28-8c22-ba12cdd31288	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101199 est en attente de confirmation.	{"trip_id": "db28d731-a5ad-4317-b946-1943dec553bc", "reservation_id": "492e0915-2c83-4021-aa2d-ab5f99692598"}	\N	2026-10-05 13:48:36.540217+00	2026-10-05 13:48:48.061891+00	2026-10-05 13:48:49.792541+00
388d471e-a166-4864-b36d-2ce07c7ad9aa	8e88ceba-5892-4e4f-9946-14596306582c	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101207 est en attente de confirmation.	{"trip_id": "c9119520-7dce-4a6c-8b5e-bbc5203759cb", "reservation_id": "c2d40f23-ed94-4978-bc2d-c7f9b44ff23b"}	\N	2026-10-05 14:02:48.173016+00	2026-10-05 14:02:58.765693+00	2026-10-05 14:02:59.879452+00
54898594-780c-4348-840a-828036ab7ae3	8e88ceba-5892-4e4f-9946-14596306582c	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101207 a été confirmée par le chauffeur.	{"trip_id": "c9119520-7dce-4a6c-8b5e-bbc5203759cb", "reservation_id": "c2d40f23-ed94-4978-bc2d-c7f9b44ff23b"}	\N	2026-10-05 14:03:09.120031+00	2026-10-05 14:03:18.450811+00	2026-10-05 14:03:20.568238+00
a894a670-8fd4-4702-a8ca-5d13396a5e29	3b85b96f-9556-4102-8b40-9c714bd92df2	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101210 a été confirmée par le chauffeur.	{"trip_id": "c9119520-7dce-4a6c-8b5e-bbc5203759cb", "reservation_id": "443484d4-0227-4cc4-9f3c-66f1de94d030"}	\N	2026-10-05 14:03:21.856041+00	2026-10-05 14:03:28.92015+00	2026-10-05 14:03:29.841016+00
ed7d5167-6fa6-4a86-96dd-1d7ce2838157	7be40049-a06f-4a22-8fbe-a3499fbc9386	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": 36.75, "lon": 3.06, "trip_id": null, "sos_event_id": "0eae3866-1db6-4c12-a1e3-90f7c1d313b4", "reservation_id": null}	\N	2026-10-04 18:38:53.737706+00	2026-10-04 21:12:15.673657+00	\N
15b92868-e3ea-4de1-ad2d-4727f005ab1e	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": 36.75, "lon": 3.06, "trip_id": null, "sos_event_id": "0eae3866-1db6-4c12-a1e3-90f7c1d313b4", "reservation_id": null}	\N	2026-10-04 18:38:53.737706+00	2026-10-04 21:12:15.673657+00	\N
ea983689-5c2a-4c9e-b17a-04f822c010fa	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	new_message	Nouveau message	Bonjour!	{"conversation_id": "80a48746-1957-4a79-a624-d6a821b8192a"}	\N	2026-10-04 18:39:00.436999+00	2026-10-04 21:12:15.673657+00	\N
d8bafc57-23b6-4aa6-a7b8-af41590fa04d	7be40049-a06f-4a22-8fbe-a3499fbc9386	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "a62978b6-fc3e-4308-bc54-a7075ecf5748", "reservation_id": null}	\N	2026-10-04 18:49:58.833563+00	2026-10-04 21:12:15.673657+00	\N
3e56385b-470b-4755-a892-e10067bbc81c	7be40049-a06f-4a22-8fbe-a3499fbc9386	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "5f1f35b1-05b5-4b85-8ee5-c38c98cd569d", "reservation_id": null}	\N	2026-10-04 18:50:33.127871+00	2026-10-04 21:12:15.673657+00	\N
6288a5f7-481e-49ec-8281-8b60258912e5	7be40049-a06f-4a22-8fbe-a3499fbc9386	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "0a75a9a0-9aae-48f3-943f-d2c860a874e3", "reservation_id": null}	\N	2026-10-04 18:51:00.060388+00	2026-10-04 21:12:15.673657+00	\N
06415fd9-934b-4a54-be4a-d8b327fd12bb	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "0a75a9a0-9aae-48f3-943f-d2c860a874e3", "reservation_id": null}	\N	2026-10-04 18:51:00.060388+00	2026-10-04 21:12:15.673657+00	\N
1d848310-6169-4f54-bc85-b66d9e1d96b9	7be40049-a06f-4a22-8fbe-a3499fbc9386	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "9d4b3e5b-55ba-445c-9ff2-2d12de747759", "reservation_id": null}	\N	2026-10-04 18:52:30.800998+00	2026-10-04 21:12:15.673657+00	\N
4577e3d4-49a4-4ea2-a1a6-0f0b1360718e	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "a62978b6-fc3e-4308-bc54-a7075ecf5748", "reservation_id": null}	2026-10-05 07:13:52.315279+00	2026-10-04 18:49:58.833563+00	2026-10-04 21:12:15.673657+00	\N
9b01cf82-d0e4-423c-83aa-cc463dc3dbbe	8e88ceba-5892-4e4f-9946-14596306582c	trip_completed	Voyage terminé	Votre voyage RES-202610-101207 est terminé. Merci d'avoir voyagé avec nous !	{"trip_id": "c9119520-7dce-4a6c-8b5e-bbc5203759cb", "reservation_id": "c2d40f23-ed94-4978-bc2d-c7f9b44ff23b"}	\N	2026-10-05 14:04:40.848015+00	2026-10-05 14:04:49.755292+00	\N
90e613e7-d42e-4529-817d-dec556d74510	56ad3ded-caed-4c51-ba2e-ff4027aec484	trip_completed	Voyage terminé	Votre voyage RES-202610-101208 est terminé. Merci d'avoir voyagé avec nous !	{"trip_id": "c9119520-7dce-4a6c-8b5e-bbc5203759cb", "reservation_id": "06b70c44-9258-42c1-a050-6445a1fcbbdf"}	\N	2026-10-05 14:04:40.848015+00	2026-10-05 14:04:49.755292+00	\N
c51f6dce-73a1-48a9-b719-153183479372	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "9d4b3e5b-55ba-445c-9ff2-2d12de747759", "reservation_id": null}	\N	2026-10-04 18:52:30.800998+00	2026-10-04 21:12:15.673657+00	\N
6c8ebb47-81c3-4b8b-b7c5-731a5397a398	7be40049-a06f-4a22-8fbe-a3499fbc9386	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "7e86be72-6bb6-4863-bb06-72274c4ddab1", "reservation_id": null}	\N	2026-10-04 18:53:06.738962+00	2026-10-04 21:12:15.673657+00	\N
b1f23040-3a1a-4561-bc2c-4dc99eb2779c	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	new_message	Nouveau message	Bonjour, je serai à l’arrêt à l’heure.	{"conversation_id": "362a6fc2-241c-4441-b1af-3cce2170389f"}	\N	2026-10-04 18:53:54.800577+00	2026-10-04 21:12:15.673657+00	\N
05fd2c97-ab68-4f6b-914a-c8c3736d2078	7b58aaaf-1746-4dba-a2b4-665f68d56387	new_message	Nouveau message	Bien reçu, à tout à l’heure.	{"conversation_id": "362a6fc2-241c-4441-b1af-3cce2170389f"}	\N	2026-10-04 18:54:05.254068+00	2026-10-04 21:12:15.673657+00	\N
430f7a93-db9b-4966-b3ca-f03cc4f0a3d4	56312ce4-492b-45c5-b797-e3dcfe4c0f3c	new_message	Nouveau message	Bonjour, je serai à l’arrêt à l’heure.	{"conversation_id": "07cd1335-dd6a-41b2-835f-1ba0c4bd0e95"}	\N	2026-10-04 18:55:29.312921+00	2026-10-04 21:12:15.673657+00	\N
a0176c1b-fc70-4961-8db9-5bfa959c75b2	7b58aaaf-1746-4dba-a2b4-665f68d56387	new_message	Nouveau message	Bien reçu, à tout à l’heure.	{"conversation_id": "07cd1335-dd6a-41b2-835f-1ba0c4bd0e95"}	\N	2026-10-04 18:55:44.938648+00	2026-10-04 21:12:15.673657+00	\N
f7bad47c-5fb9-45d6-803a-a0da1a9084b5	7be40049-a06f-4a22-8fbe-a3499fbc9386	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "71b16b40-24c6-47df-b01b-9f9447f8584e", "reservation_id": null}	\N	2026-10-04 19:06:49.63925+00	2026-10-04 21:12:15.673657+00	\N
59895240-8819-4229-b726-de182b98ce91	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "71b16b40-24c6-47df-b01b-9f9447f8584e", "reservation_id": null}	\N	2026-10-04 19:06:49.63925+00	2026-10-04 21:12:15.673657+00	\N
8137adbe-cc38-41c7-9dbb-e0916b4182e8	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "5f1f35b1-05b5-4b85-8ee5-c38c98cd569d", "reservation_id": null}	2026-10-04 19:18:09.687923+00	2026-10-04 18:50:33.127871+00	2026-10-04 21:12:15.673657+00	\N
3c9e1617-fb82-40e8-9523-01f397984832	7be40049-a06f-4a22-8fbe-a3499fbc9386	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": 36.75, "lon": 3.06, "trip_id": "5aa4485e-c7bf-4e14-8b6f-f5fdc61481a3", "sos_event_id": "8d59f42b-12d5-4c89-b550-ded287e5aeba", "reservation_id": "979a9526-335f-4466-bd40-04f3a3996811"}	\N	2026-10-04 19:18:33.312992+00	2026-10-04 21:12:15.673657+00	\N
f563219a-60d1-4f1b-8654-35e6e65e9651	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": 36.75, "lon": 3.06, "trip_id": "5aa4485e-c7bf-4e14-8b6f-f5fdc61481a3", "sos_event_id": "8d59f42b-12d5-4c89-b550-ded287e5aeba", "reservation_id": "979a9526-335f-4466-bd40-04f3a3996811"}	\N	2026-10-04 19:18:33.312992+00	2026-10-04 21:12:15.673657+00	\N
51c43f46-bffc-4fa8-b23f-edb29a593144	a8107d18-5a8e-4d88-a573-a866f4c3d0c2	sos_triggered	🆘 Alerte SOS	Une alerte SOS a été déclenchée.	{"lat": null, "lon": null, "trip_id": null, "sos_event_id": "7e86be72-6bb6-4863-bb06-72274c4ddab1", "reservation_id": null}	2026-10-05 07:13:49.948891+00	2026-10-04 18:53:06.738962+00	2026-10-04 21:12:15.673657+00	\N
93559feb-6f67-4042-98cf-af8ba5449f93	d099b557-a5c6-4943-ae2e-36b01e299e70	trip_completed	Voyage terminé	Votre voyage RES-202610-101085 est terminé. Merci d'avoir voyagé avec nous !	{"trip_id": "f7b94306-9a95-4f09-895c-63dfba351f75", "reservation_id": "5f089d6b-2e97-4e68-9333-842b1ea33a60"}	\N	2026-10-05 08:41:07.695832+00	2026-10-05 08:41:23.503575+00	\N
ab7793fc-84c3-4a20-a6c4-4056e22b3ff1	9594a202-911b-4c9c-8a94-1ce729c16769	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101071 est en attente de confirmation.	{"trip_id": "cc251e6b-2931-4880-a80b-8cb609bfa58f", "reservation_id": "1a0d1e25-fba3-4cf3-9e1a-6af9a2376ebf"}	\N	2026-10-05 08:20:53.815492+00	2026-10-05 08:21:05.12166+00	2026-10-05 08:21:03.991145+00
9d70d9db-4070-472b-a8ff-73337e4574a8	5e9914d2-3cf3-4c40-9322-e69a6c6fb87d	trip_completed	Voyage terminé	Votre voyage RES-202610-101086 est terminé. Merci d'avoir voyagé avec nous !	{"trip_id": "f7b94306-9a95-4f09-895c-63dfba351f75", "reservation_id": "282d053d-695e-432f-8dbe-cd183aca10e8"}	\N	2026-10-05 08:41:07.695832+00	2026-10-05 08:41:23.503575+00	\N
8da28612-48c0-4e52-9afe-22a0d5c7a451	6bd2f8c8-dd03-4236-a3e9-dea534b840be	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101194 est en attente de confirmation.	{"trip_id": "db28d731-a5ad-4317-b946-1943dec553bc", "reservation_id": "dc10e16b-54c3-4302-bd5f-97d2db3e791f"}	\N	2026-10-05 13:48:21.032169+00	2026-10-05 13:48:28.445634+00	2026-10-05 13:48:28.187007+00
29010b43-bbb4-4806-b1b2-a0c28bbb771a	9594a202-911b-4c9c-8a94-1ce729c16769	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101071 a été confirmée par le chauffeur.	{"trip_id": "cc251e6b-2931-4880-a80b-8cb609bfa58f", "reservation_id": "1a0d1e25-fba3-4cf3-9e1a-6af9a2376ebf"}	\N	2026-10-05 08:21:37.126206+00	2026-10-05 08:21:44.084402+00	2026-10-05 08:21:43.937752+00
0bd28180-0c73-4375-847e-425aace4eecb	6bd2f8c8-dd03-4236-a3e9-dea534b840be	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101194 a été confirmée par le chauffeur.	{"trip_id": "db28d731-a5ad-4317-b946-1943dec553bc", "reservation_id": "dc10e16b-54c3-4302-bd5f-97d2db3e791f"}	\N	2026-10-05 13:48:41.928401+00	2026-10-05 13:48:48.061891+00	2026-10-05 13:48:49.792541+00
d3dd89c8-3120-489d-b60b-87ea87cb74c7	9594a202-911b-4c9c-8a94-1ce729c16769	reservation_cancelled	Réservation annulée	Votre réservation RES-202610-101071 a été annulée.	{"trip_id": "cc251e6b-2931-4880-a80b-8cb609bfa58f", "reservation_id": "1a0d1e25-fba3-4cf3-9e1a-6af9a2376ebf"}	2026-10-05 08:22:19.070265+00	2026-10-05 08:22:04.383484+00	2026-10-05 08:22:24.005953+00	2026-10-05 08:22:23.990601+00
e8784033-543d-406a-9209-0503dd7daa44	56ad3ded-caed-4c51-ba2e-ff4027aec484	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101208 est en attente de confirmation.	{"trip_id": "c9119520-7dce-4a6c-8b5e-bbc5203759cb", "reservation_id": "06b70c44-9258-42c1-a050-6445a1fcbbdf"}	\N	2026-10-05 14:02:53.717453+00	2026-10-05 14:02:58.765693+00	2026-10-05 14:02:59.879452+00
809072d5-1630-4cd9-8778-31e162740c21	49fb59cc-2c0a-4111-8c6e-184732909fb9	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101077 est en attente de confirmation.	{"trip_id": "e4541d84-8f83-47ef-8698-b95ee15cf9af", "reservation_id": "b42f9cb1-54f0-4ba0-9390-3175b6cf87e2"}	\N	2026-10-05 08:28:32.353739+00	2026-10-05 08:28:44.088338+00	2026-10-05 08:28:44.624382+00
89d2341f-9aa9-4704-8441-2eeebfe9ca15	49fb59cc-2c0a-4111-8c6e-184732909fb9	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101077 a été confirmée par le chauffeur.	{"trip_id": "e4541d84-8f83-47ef-8698-b95ee15cf9af", "reservation_id": "b42f9cb1-54f0-4ba0-9390-3175b6cf87e2"}	\N	2026-10-05 08:29:17.115477+00	2026-10-05 08:29:23.995239+00	2026-10-05 08:29:25.686425+00
cc83f851-c366-4c8d-8057-f890eeddda80	49fb59cc-2c0a-4111-8c6e-184732909fb9	reservation_cancelled	Réservation annulée	Votre réservation RES-202610-101077 a été annulée.	{"trip_id": "e4541d84-8f83-47ef-8698-b95ee15cf9af", "reservation_id": "b42f9cb1-54f0-4ba0-9390-3175b6cf87e2"}	2026-10-05 08:30:02.122495+00	2026-10-05 08:29:43.894511+00	2026-10-05 08:30:05.84818+00	2026-10-05 08:30:05.326957+00
17cfd5bd-9dc0-42a8-bc75-40279364649b	d099b557-a5c6-4943-ae2e-36b01e299e70	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101085 est en attente de confirmation.	{"trip_id": "f7b94306-9a95-4f09-895c-63dfba351f75", "reservation_id": "5f089d6b-2e97-4e68-9333-842b1ea33a60"}	\N	2026-10-05 08:39:19.724754+00	2026-10-05 08:39:23.477351+00	2026-10-05 08:39:25.188296+00
563f3ce9-26b1-432f-a444-e4f00a384fc0	5e9914d2-3cf3-4c40-9322-e69a6c6fb87d	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101086 est en attente de confirmation.	{"trip_id": "f7b94306-9a95-4f09-895c-63dfba351f75", "reservation_id": "282d053d-695e-432f-8dbe-cd183aca10e8"}	\N	2026-10-05 08:39:25.881509+00	2026-10-05 08:39:43.565433+00	2026-10-05 08:39:47.419546+00
eb0727b9-2c54-4304-ac02-f5fd6b228219	b678e16b-1c9c-4dee-82ee-6ed88d1db99c	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101142 est en attente de confirmation.	{"trip_id": "374a08ea-516b-452c-8189-e4db9ff63b1c", "reservation_id": "27eb4e19-deec-4fdb-a4b3-57acc9a72b9a"}	\N	2026-10-05 13:41:46.552721+00	2026-10-05 13:42:01.374203+00	2026-10-05 13:41:58.812999+00
2197726f-9304-4e9d-afc3-52c01749a362	49c38585-89e8-4a75-91a6-7bdccae35f45	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101197 est en attente de confirmation.	{"trip_id": "db28d731-a5ad-4317-b946-1943dec553bc", "reservation_id": "d020dcea-49a7-49a2-b806-e88899f60c0d"}	\N	2026-10-05 13:48:26.437193+00	2026-10-05 13:48:38.315765+00	2026-10-05 13:48:39.786369+00
bbde8f78-77cb-4627-a40b-3c4429baf191	49c38585-89e8-4a75-91a6-7bdccae35f45	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101197 a été confirmée par le chauffeur.	{"trip_id": "db28d731-a5ad-4317-b946-1943dec553bc", "reservation_id": "d020dcea-49a7-49a2-b806-e88899f60c0d"}	\N	2026-10-05 13:48:45.930227+00	2026-10-05 13:49:58.460232+00	2026-10-05 13:49:59.620366+00
b7fdd350-4057-4b4a-8d91-3f3dc2457d3b	d099b557-a5c6-4943-ae2e-36b01e299e70	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101085 a été confirmée par le chauffeur.	{"trip_id": "f7b94306-9a95-4f09-895c-63dfba351f75", "reservation_id": "5f089d6b-2e97-4e68-9333-842b1ea33a60"}	\N	2026-10-05 08:39:40.328478+00	2026-10-05 08:39:43.565433+00	2026-10-05 08:39:47.419546+00
b2c70e43-a9d4-47a6-bce6-380d850ff635	e9fb6a6e-ae7e-435e-b982-9435460a074d	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101087 est en attente de confirmation.	{"trip_id": "f7b94306-9a95-4f09-895c-63dfba351f75", "reservation_id": "faf3172b-bded-40f3-8a11-c4f0e014e92e"}	\N	2026-10-05 08:39:31.146216+00	2026-10-05 08:39:43.565433+00	2026-10-05 08:39:47.419546+00
48dc6845-02fd-4909-ab06-54bba1d50223	f1ebea60-f6e5-4bfc-85a5-3e7d4561c3bb	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101088 est en attente de confirmation.	{"trip_id": "f7b94306-9a95-4f09-895c-63dfba351f75", "reservation_id": "8263e70c-c13a-4c44-b953-20682dd1c95e"}	\N	2026-10-05 08:39:35.070559+00	2026-10-05 08:39:43.565433+00	2026-10-05 08:39:47.419546+00
333bc47e-a2e3-4ecc-a106-a4685f982dfe	65cf9374-7cd2-47fd-9a9e-da1466c31170	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101209 est en attente de confirmation.	{"trip_id": "c9119520-7dce-4a6c-8b5e-bbc5203759cb", "reservation_id": "111bc48e-38f7-4116-a394-0fe3ca9dddd7"}	\N	2026-10-05 14:02:59.450659+00	2026-10-05 14:03:08.597166+00	2026-10-05 14:03:10.097532+00
b21f5258-f987-4f75-960c-386522f7bf04	65cf9374-7cd2-47fd-9a9e-da1466c31170	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101209 a été confirmée par le chauffeur.	{"trip_id": "c9119520-7dce-4a6c-8b5e-bbc5203759cb", "reservation_id": "111bc48e-38f7-4116-a394-0fe3ca9dddd7"}	\N	2026-10-05 14:03:17.227344+00	2026-10-05 14:03:28.92015+00	2026-10-05 14:03:29.841016+00
c4807dc6-c047-418d-b75c-daa02576a325	56ad3ded-caed-4c51-ba2e-ff4027aec484	payment_confirmed	Paiement confirmé	Votre paiement de 500.00 DZD pour la réservation RES-202610-101208 a été confirmé.	{"payment_id": "b659f9bd-e411-478d-abdc-de5cb9c74395", "reservation_id": "06b70c44-9258-42c1-a050-6445a1fcbbdf"}	\N	2026-10-05 14:03:41.816049+00	2026-10-05 14:03:48.474534+00	2026-10-05 14:03:48.471525+00
d5915ac7-b144-4521-af79-f6176dcc7c4c	5e9914d2-3cf3-4c40-9322-e69a6c6fb87d	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101086 a été confirmée par le chauffeur.	{"trip_id": "f7b94306-9a95-4f09-895c-63dfba351f75", "reservation_id": "282d053d-695e-432f-8dbe-cd183aca10e8"}	\N	2026-10-05 08:39:44.328199+00	2026-10-05 08:40:03.634516+00	2026-10-05 08:40:06.288193+00
f8905544-6107-444d-b53a-1635bddefd9c	e9fb6a6e-ae7e-435e-b982-9435460a074d	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101087 a été confirmée par le chauffeur.	{"trip_id": "f7b94306-9a95-4f09-895c-63dfba351f75", "reservation_id": "faf3172b-bded-40f3-8a11-c4f0e014e92e"}	\N	2026-10-05 08:39:48.326996+00	2026-10-05 08:40:03.634516+00	2026-10-05 08:40:06.288193+00
c5de1970-131c-462b-895b-22e57f58b665	f1ebea60-f6e5-4bfc-85a5-3e7d4561c3bb	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101088 a été confirmée par le chauffeur.	{"trip_id": "f7b94306-9a95-4f09-895c-63dfba351f75", "reservation_id": "8263e70c-c13a-4c44-b953-20682dd1c95e"}	\N	2026-10-05 08:39:52.314973+00	2026-10-05 08:40:03.634516+00	2026-10-05 08:40:06.288193+00
8ab4c5da-c778-46a9-8dd3-005f4cb9df2e	5e9914d2-3cf3-4c40-9322-e69a6c6fb87d	payment_confirmed	Paiement confirmé	Votre paiement de 500.00 DZD pour la réservation RES-202610-101086 a été confirmé.	{"payment_id": "fd78383a-fa3e-4771-8a42-360c01ccdbc3", "reservation_id": "282d053d-695e-432f-8dbe-cd183aca10e8"}	\N	2026-10-05 08:40:12.656491+00	2026-10-05 08:40:23.521435+00	2026-10-05 08:40:23.535101+00
78c3036b-c636-4a10-b49f-f20ad15b007a	b678e16b-1c9c-4dee-82ee-6ed88d1db99c	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101142 a été confirmée par le chauffeur.	{"trip_id": "374a08ea-516b-452c-8189-e4db9ff63b1c", "reservation_id": "27eb4e19-deec-4fdb-a4b3-57acc9a72b9a"}	\N	2026-10-05 13:42:40.681405+00	2026-10-05 13:42:49.539953+00	2026-10-05 13:42:49.672866+00
c3371f44-db17-4533-a6cf-e77c61fb5894	e36cccc6-b3db-4a9c-a669-d175381b60e0	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101198 est en attente de confirmation.	{"trip_id": "db28d731-a5ad-4317-b946-1943dec553bc", "reservation_id": "56a0370d-a7f4-40a9-9e62-68d912a407f2"}	\N	2026-10-05 13:48:32.348963+00	2026-10-05 13:48:38.315765+00	2026-10-05 13:48:39.786369+00
727dcc42-1a31-4067-91ea-5c1a71cb651e	e36cccc6-b3db-4a9c-a669-d175381b60e0	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101198 a été confirmée par le chauffeur.	{"trip_id": "db28d731-a5ad-4317-b946-1943dec553bc", "reservation_id": "56a0370d-a7f4-40a9-9e62-68d912a407f2"}	\N	2026-10-05 13:48:49.870036+00	2026-10-05 13:49:58.460232+00	2026-10-05 13:49:59.620366+00
aafc37e9-1dd4-4631-9756-3a2cf6a1f026	3b85b96f-9556-4102-8b40-9c714bd92df2	booking_request	Demande de réservation envoyée	Votre demande de réservation RES-202610-101210 est en attente de confirmation.	{"trip_id": "c9119520-7dce-4a6c-8b5e-bbc5203759cb", "reservation_id": "443484d4-0227-4cc4-9f3c-66f1de94d030"}	\N	2026-10-05 14:03:03.610884+00	2026-10-05 14:03:08.597166+00	2026-10-05 14:03:10.097532+00
312c2bdb-9af1-4000-aaeb-81bbbe2b2d58	56ad3ded-caed-4c51-ba2e-ff4027aec484	reservation_approved	Réservation confirmée	Votre réservation RES-202610-101208 a été confirmée par le chauffeur.	{"trip_id": "c9119520-7dce-4a6c-8b5e-bbc5203759cb", "reservation_id": "06b70c44-9258-42c1-a050-6445a1fcbbdf"}	\N	2026-10-05 14:03:13.214779+00	2026-10-05 14:03:18.450811+00	2026-10-05 14:03:20.568238+00
f300880a-9fdd-479a-ba56-ac584baf4dd4	65cf9374-7cd2-47fd-9a9e-da1466c31170	reservation_cancelled	Réservation annulée	Votre réservation RES-202610-101209 a été annulée.	{"trip_id": "c9119520-7dce-4a6c-8b5e-bbc5203759cb", "reservation_id": "111bc48e-38f7-4116-a394-0fe3ca9dddd7"}	\N	2026-10-05 14:04:12.974763+00	2026-10-05 14:04:19.374577+00	2026-10-05 14:04:18.569958+00
\.


--
-- Data for Name: payment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payment" ("id", "code", "reservation_id", "amount", "refunded_amount", "currency", "method", "status", "reference", "paid_at", "created_at", "updated_at", "gateway", "gateway_transaction_id", "failure_reason", "expires_at") FROM stdin;
bfd4c305-8fbb-484d-99a3-1c990c36f853	PAY-202610-100333	d88831aa-16b3-4c5a-9277-207ec0b7cdcf	2300.00	0.00	DZD	edahabia	failed	MGW-4cd7cd3a7905c3384c3b	\N	2026-10-04 12:52:28.898839+00	2026-10-04 18:26:30.55095+00	mock_gateway	MGW-4cd7cd3a7905c3384c3b	\N	\N
4b9b422b-8d7c-4ddf-8358-3fa81ad019af	PAY-202610-100332	82758c6c-5522-406e-9723-86cc66d8ad46	2300.00	0.00	DZD	cib	failed	MGW-86fe868b6a8720caa018	\N	2026-10-04 12:52:02.497389+00	2026-10-04 18:26:25.258274+00	mock_gateway	MGW-86fe868b6a8720caa018	\N	\N
9e089244-789e-4560-a070-7a6625fc6c83	PAY-202610-100334	eb143532-030e-4913-9d1c-c082bd34ce0d	1500.00	0.00	DZD	bank_transfer	failed	MGW-a1483eb785a5faeac0cc	\N	2026-10-04 12:52:47.030257+00	2026-10-04 18:26:29.527166+00	mock_gateway	MGW-a1483eb785a5faeac0cc	\N	\N
\.


--
-- Data for Name: payment_gateway_event; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payment_gateway_event" ("id", "payment_id", "gateway", "gateway_event_id", "event_type", "signature_valid", "raw_payload", "processing_result", "processing_note", "received_at") FROM stdin;
e671c8b0-6add-4ce8-8155-ac4625847d54	\N	mock_gateway	evt_3fd767f64411df99d055	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-04 09:55:23.143446+00
3103ee0b-f3a5-4600-88f4-bf18d1ac5777	\N	mock_gateway	evt_53970f4213ab01f9a096	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-04 10:01:41.733917+00
1cad0bf3-deb6-478f-b553-4c77048adf0a	\N	mock_gateway	evt_496c78ddfc4e0e57263c	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-05 07:35:31.878972+00
2cda636c-3ac0-490a-80a7-afe88e7efdfc	\N	mock_gateway	evt_c455a59e269f6840805c	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-04 10:15:19.923091+00
2cde04b0-8559-48e6-94bc-4c6d8c1c5e98	\N	mock_gateway	evt_9131a786117648ae2d9a	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-05 07:55:25.054968+00
7a81a958-f4e2-4d4c-9c4c-16629208da32	\N	mock_gateway	evt_6cc6978e4f088f27f14b	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-04 15:42:30.762118+00
63bd627a-aebd-468a-9034-76caaf4972b0	\N	mock_gateway	evt_605c16a8a6617fade0bf	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-04 15:51:44.741936+00
b5fb8f72-b28c-4c78-bd7a-05240bd7698e	\N	mock_gateway	evt_9856a1e13d834b27d11b	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-04 16:00:48.874808+00
f3c631d8-6771-4515-bc6f-d9db06a34a5e	\N	mock_gateway	evt_b74d3b40e5ad65d1d379	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-05 13:44:08.119848+00
0e910a01-91f8-4690-ae27-73e515da5881	\N	mock_gateway	evt_39092e006a3a3bd8ea5c	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-04 16:11:03.770733+00
3e360a4a-c4d4-43a4-a13d-29ccbc51483a	\N	mock_gateway	evt_e70804b5218060d33777	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-04 16:27:50.173808+00
cccfa33e-65d3-4bec-bc85-28c80816e542	\N	mock_gateway	evt_3bc374b16d0b46896b35	payment.succeeded	t	{}	rejected	Unknown payment	2026-10-05 07:19:23.240679+00
\.


--
-- Data for Name: payout_batch; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payout_batch" ("id", "driver_id", "period_start", "period_end", "total_amount", "status", "reference", "created_at", "paid_at") FROM stdin;
c04e67eb-552c-40e5-adad-2f5ea6b20d4f	4a3224f6-f620-4f45-ae5b-8c0ca567bc68	2025-10-05 13:46:38.146+00	2026-10-06 13:46:38.146+00	850.00	paid	TEST-REF-1791207377935	2026-10-05 13:46:39.383036+00	2026-10-05 13:46:41.961138+00
\.


--
-- Data for Name: payout_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payout_ledger" ("id", "driver_id", "trip_id", "reservation_id", "payment_id", "entry_type", "gross_amount", "commission_pct", "commission_amount", "net_amount", "payout_batch_id", "created_at") FROM stdin;
1f4c2358-41b5-4acf-932e-fa3d318da953	6ca4cb53-9cac-46e0-941f-1a0320f2b5f7	\N	\N	\N	earning	500.00	15.00	75.00	425.00	\N	2026-10-05 13:43:15.951821+00
0805a843-ce5f-4947-80fd-b88abe4f0a2f	4a3224f6-f620-4f45-ae5b-8c0ca567bc68	\N	\N	\N	earning	1000.00	15.00	150.00	850.00	c04e67eb-552c-40e5-adad-2f5ea6b20d4f	2026-10-05 13:46:31.455941+00
6e70b82d-b330-4ecb-a2f1-65ccca9c0111	4a3224f6-f620-4f45-ae5b-8c0ca567bc68	\N	\N	\N	refund_adjustment	-1000.00	15.00	-150.00	-850.00	\N	2026-10-05 13:46:47.649061+00
6af24578-3a95-4056-ab68-1046a26ad6fd	869b198d-9836-415f-a1a4-c7032b6c78df	\N	\N	\N	earning	300.00	15.00	45.00	255.00	\N	2026-10-05 13:48:12.029704+00
f74963f5-b8b5-44a6-bcc7-b71959d1fec8	869b198d-9836-415f-a1a4-c7032b6c78df	\N	\N	\N	earning	300.00	15.00	45.00	255.00	\N	2026-10-05 13:48:31.172337+00
\.


--
-- Data for Name: promo_code; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."promo_code" ("id", "code", "discount_type", "discount_value", "min_amount", "max_uses_total", "max_uses_per_customer", "starts_at", "expires_at", "active", "created_by", "created_at") FROM stdin;
\.


--
-- Data for Name: promo_redemption; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."promo_redemption" ("id", "promo_code_id", "customer_id", "reservation_id", "discount_amount", "created_at") FROM stdin;
\.


--
-- Data for Name: push_subscription; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."push_subscription" ("id", "user_id", "endpoint", "p256dh", "auth", "user_agent", "created_at", "last_seen_at") FROM stdin;
\.


--
-- Data for Name: rating; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."rating" ("id", "reservation_id", "direction", "rater_customer_id", "rater_driver_id", "ratee_customer_id", "ratee_driver_id", "stars", "review", "hidden_at", "moderation_reason", "moderated_by", "created_at") FROM stdin;
\.


--
-- Data for Name: recurring_trip_exception; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."recurring_trip_exception" ("id", "template_id", "exception_date", "notes", "created_at") FROM stdin;
\.


--
-- Data for Name: referral_reward; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."referral_reward" ("id", "referrer_id", "referred_id", "trigger_reservation_id", "reward_amount", "status", "created_at") FROM stdin;
\.


--
-- Data for Name: refund; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."refund" ("id", "payment_id", "reservation_id", "amount", "policy_pct", "status", "initiated_by", "admin_id", "gateway", "gateway_refund_id", "failure_reason", "created_at", "processed_at") FROM stdin;
\.


--
-- Data for Name: reservation_passenger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."reservation_passenger" ("id", "reservation_id", "full_name", "phone", "fare_share", "created_at") FROM stdin;
570cdb3e-c061-4880-9509-077286b2f2cc	eb143532-030e-4913-9d1c-c082bd34ce0d	Passager 1	\N	\N	2026-10-04 18:55:11.33583+00
\.


--
-- Data for Name: search_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."search_log" ("id", "from_wilaya_id", "to_wilaya_id", "from_commune_id", "to_commune_id", "date_from", "date_to", "results_count", "created_at") FROM stdin;
b9a826d5-0ee4-43e7-bda5-5f5d830b1308	1	2	\N	\N	2099-01-01	2099-01-01	0	2026-10-04 19:15:33.06395+00
0560c0d1-6fa1-4b14-b414-42d129e5d93c	1	2	\N	\N	\N	\N	0	2026-10-04 19:15:34.401721+00
2246810e-759d-4f50-8046-c634d9e72cf6	1	2	\N	\N	\N	\N	0	2026-10-04 19:15:59.810212+00
440d04b4-10bc-4896-9bbe-a56ba3bcb2d0	5	6	\N	\N	2099-03-03	2099-03-03	0	2026-10-04 19:16:09.768666+00
b0c99084-dba2-4907-ab19-532797b761d8	1	2	\N	\N	\N	\N	0	2026-10-04 19:24:19.084256+00
71e5459f-4c14-41fa-a497-87ba4453b9d8	1	2	\N	\N	\N	\N	0	2026-10-04 19:45:47.968867+00
33e1f955-17db-4a6f-9811-74f50bad56e9	16	9	\N	\N	\N	\N	0	2026-10-05 08:13:54.076742+00
9bc38a19-d8df-494c-940c-8baff9c220c8	16	9	\N	\N	\N	\N	1	2026-10-05 08:20:43.17356+00
2716412e-5f08-49d0-86bd-5d83434fc80c	16	9	\N	\N	\N	\N	1	2026-10-05 08:28:24.463414+00
30936994-546d-4768-a740-1fb9b482cbc6	16	17	\N	\N	\N	\N	1	2026-10-05 08:38:01.206373+00
8ca7749c-8a40-4cb9-bd50-a21b331a6ace	16	9	\N	\N	\N	\N	1	2026-10-05 08:38:02.449536+00
aedff96f-643a-49dc-8621-2425b0d02756	16	9	\N	\N	\N	\N	0	2026-10-05 13:33:20.95428+00
0d73af3f-fa03-4957-a630-ac0d9b7a0456	16	9	\N	\N	\N	\N	0	2026-10-05 13:36:02.106003+00
3c766c96-5e53-477a-8bde-5659ba31756a	16	9	\N	\N	\N	\N	8	2026-10-05 13:41:36.705908+00
ca94794d-1da5-4aa7-812a-336adfa5fd0f	16	17	\N	\N	\N	\N	7	2026-10-05 13:46:59.486554+00
45bc633f-11c7-48ea-a20b-1bb90f95f3c1	16	9	\N	\N	\N	\N	12	2026-10-05 13:47:00.882326+00
dbfe8f72-56ec-4e84-8b16-0c8e9b27142b	16	17	\N	\N	\N	\N	1	2026-10-05 13:54:33.095844+00
d7218c01-7844-495c-8d7d-6f3a76800e78	16	9	\N	\N	\N	\N	1	2026-10-05 13:54:34.395189+00
8335d28e-d611-4f7f-b788-bbf35c51f0ce	16	17	\N	\N	\N	\N	1	2026-10-05 14:01:23.635854+00
af59e1b2-f17d-4854-bf22-cbb5fdd2538d	16	9	\N	\N	\N	\N	1	2026-10-05 14:01:25.338561+00
ad3eec8e-c66b-4b5a-8cb1-27f524194c73	16	47	\N	\N	\N	\N	0	2026-10-05 14:14:00.608171+00
2b95f541-4346-4ed8-96ae-bf65b52e3931	16	17	\N	\N	\N	\N	0	2026-10-05 14:14:14.386248+00
\.


--
-- Data for Name: sms_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."sms_log" ("id", "user_id", "phone", "purpose", "notification_id", "message", "status", "provider_message_id", "error", "created_at") FROM stdin;
c385d44b-07f8-49bf-902a-e697a199842d	69b2743b-4061-40b6-aa1a-0eaa1809bc17	+213555000111	otp	\N	Wassalni — votre code de connexion : 416120. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-5b70d29f-d772-403f-8b6d-dceb46d16ba2	\N	2026-10-04 21:24:00.275945+00
3c94b6c4-7551-407a-857d-d10fd9f2e88e	ee651e63-0fd3-44a4-88ff-9fa4dbd4a30f	+213555000222	otp	\N	Wassalni — votre code de connexion : 976266. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-64ab906f-467a-4d41-979f-3e6d54f420b2	\N	2026-10-04 21:44:13.951461+00
5cccd1e1-74b7-486e-a40c-c710f0cc364b	006618bc-4afa-48ae-a381-02bd3c53eea3	+213555000333	otp	\N	Wassalni — votre code de connexion : 887788. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-3ec233af-e66d-4729-b842-f5dc01635695	\N	2026-10-04 21:49:08.62989+00
1d71ff99-6e50-45e7-9f85-8a5bcadc2509	881dd2f7-9e0f-44a5-84d9-e10b204cc959	+213551607267	otp	\N	Wassalni — votre code de connexion : 253176. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-428626fc-f63e-499d-a42a-48506f5ffaf4	\N	2026-10-05 08:07:13.304084+00
6e438b05-47a1-40fe-b180-22ef1ec02be1	881dd2f7-9e0f-44a5-84d9-e10b204cc959	+213551607267	otp	\N	Wassalni — votre code de connexion : 508524. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-da16c8f1-9777-41f8-a1b4-de0b76ea0066	\N	2026-10-05 08:07:37.151188+00
f48962e2-da70-422c-8f76-3fef91341941	96846f1a-01cb-4d67-b40e-3bd624969b01	+213550607267	otp	\N	Wassalni — votre code de connexion : 562776. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-d0411953-e89c-4fef-b157-76e856f22f42	\N	2026-10-05 08:07:52.608908+00
643367f2-4d56-4f83-a825-4060b6ba8b95	80ec5c4f-7e12-411d-b90e-114d762f5bb4	+213551746208	otp	\N	Wassalni — votre code de connexion : 151931. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-b7434e53-0922-4e43-8e72-8f8476ef1d5d	\N	2026-10-05 08:09:35.309292+00
262b8652-cc2e-4e2c-a9e7-524521d49d0a	80ec5c4f-7e12-411d-b90e-114d762f5bb4	+213551746208	otp	\N	Wassalni — votre code de connexion : 942947. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-a4473b29-d894-4ce8-8955-a7d6003523f2	\N	2026-10-05 08:09:57.662226+00
a218d9cc-8b87-440d-a0f5-2293d4ac344b	1183f260-bb2c-4d48-ba5b-860f3c9b6f58	+213550746208	otp	\N	Wassalni — votre code de connexion : 960676. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-ec42e8ed-30df-4b86-9145-915e9c4a806c	\N	2026-10-05 08:10:13.669719+00
d102dd80-a54d-4c28-b431-13f53a44f777	45463d49-7104-46c3-a57f-e024230046b8	+213552746208	otp	\N	Wassalni — votre code de connexion : 707504. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-646c0b9d-b8e2-4d3c-8ca7-41bc15e81b4a	\N	2026-10-05 08:11:49.335486+00
9a37a00d-404b-4da6-ab93-ccbe4651b988	8f3cc8fc-b77b-4407-a5bb-0dd6aa55772d	+213554746208	otp	\N	Wassalni — votre code de connexion : 218166. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-14cb947f-f41c-49e1-afc3-556907daa15e	\N	2026-10-05 08:13:41.469596+00
17fab4d7-ac4e-4a61-a579-6abaeb6fceb9	036520cd-7dac-47ad-9a1a-56980ee67a08	+213555746208	otp	\N	Wassalni — votre code de connexion : 894793. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-3d66aee7-35e0-415f-8f96-737f9bcd5fe1	\N	2026-10-05 08:14:22.567287+00
784582c4-cd56-4545-8213-58a5b47675d2	9594a202-911b-4c9c-8a94-1ce729c16769	+213551163165	otp	\N	Wassalni — votre code de connexion : 368010. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-1a21a655-2d6f-49b3-bab1-61f7b5cce526	\N	2026-10-05 08:16:29.349127+00
da9e3845-3d1a-424f-91b5-e0cfaed46940	9594a202-911b-4c9c-8a94-1ce729c16769	+213551163165	otp	\N	Wassalni — votre code de connexion : 815045. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-bb423940-4071-47de-a843-bc2bc0fc8a59	\N	2026-10-05 08:16:53.661428+00
a35ccf78-c924-4ca0-a92c-12abbbc3f223	a238d899-407c-46c8-8c6d-f1da9a6dc611	+213550163165	otp	\N	Wassalni — votre code de connexion : 161492. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-7dc5ba78-3b54-4f9b-94dd-f5bbbc34cfdd	\N	2026-10-05 08:17:08.248914+00
31bbd4f1-737c-4ec5-bb20-5c2fa27176c6	f91ca6d7-9eff-449e-8bb1-eb031ef148c8	+213552163165	otp	\N	Wassalni — votre code de connexion : 682631. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-8b0605d3-6b49-4cd6-9cb6-d1aa4aa7c7fe	\N	2026-10-05 08:18:41.968438+00
9946883b-661f-4071-8d1c-cd77bf87bc29	046ab5ab-1992-4878-be34-8e6764af82f8	+213554163165	otp	\N	Wassalni — votre code de connexion : 745280. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-79e8729f-d8ac-4990-bb58-e31109db85ee	\N	2026-10-05 08:20:31.223755+00
8e20393a-bb9f-4cc7-ac04-f5513b411cb2	9594a202-911b-4c9c-8a94-1ce729c16769	+213551163165	notification	ab7793fc-84c3-4a20-a6c4-4056e22b3ff1	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101071 est en attente de confirmation.	sent	sandbox-55d37cd8-8a24-4d8e-af49-0c93d70fb091	\N	2026-10-05 08:21:01.842033+00
4f3bd05b-0df4-4229-ac3d-573ccbad5c6f	9594a202-911b-4c9c-8a94-1ce729c16769	+213551163165	notification	ab7793fc-84c3-4a20-a6c4-4056e22b3ff1	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101071 est en attente de confirmation.	sent	sandbox-cb7c65bb-8f2e-41b3-ab2d-bd862bfd51b8	\N	2026-10-05 08:21:02.672102+00
dc3b801f-2962-4149-91bb-1f90df1865f6	ff7d1960-add0-4f70-a2a8-33cd79fdda83	+213555163165	otp	\N	Wassalni — votre code de connexion : 281024. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-8261c4d4-6817-4cd8-8249-6f8ded331b62	\N	2026-10-05 08:21:23.731032+00
5572a970-ece6-457c-8a16-6ed1afd405b0	9594a202-911b-4c9c-8a94-1ce729c16769	+213551163165	notification	29010b43-bbb4-4806-b1b2-a0c28bbb771a	Wassalni — Réservation confirmée : Votre réservation RES-202610-101071 a été confirmée par le chauffeur.	sent	sandbox-2079ca18-7980-4b6c-bde8-8851a8b1923b	\N	2026-10-05 08:21:41.685013+00
2fb3c1cc-1266-4d12-acfb-8a65ac2b412f	9594a202-911b-4c9c-8a94-1ce729c16769	+213551163165	notification	29010b43-bbb4-4806-b1b2-a0c28bbb771a	Wassalni — Réservation confirmée : Votre réservation RES-202610-101071 a été confirmée par le chauffeur.	sent	sandbox-dcc97bd6-2e68-464c-ae30-cd53d63d5c83	\N	2026-10-05 08:21:42.631176+00
61577e89-ecf4-46e7-aca4-d42aa42470b9	9594a202-911b-4c9c-8a94-1ce729c16769	+213551163165	notification	d3dd89c8-3120-489d-b60b-87ea87cb74c7	Wassalni — Réservation annulée : Votre réservation RES-202610-101071 a été annulée.	sent	sandbox-c70424df-a85d-490c-b675-6f8baf3651d4	\N	2026-10-05 08:22:21.706338+00
b51980cf-9e66-4a6e-98b5-c234ee2783ae	9594a202-911b-4c9c-8a94-1ce729c16769	+213551163165	notification	d3dd89c8-3120-489d-b60b-87ea87cb74c7	Wassalni — Réservation annulée : Votre réservation RES-202610-101071 a été annulée.	sent	sandbox-d4856494-27b4-4bd6-aa82-b2c6c59d5882	\N	2026-10-05 08:22:22.694584+00
e4b7ace1-c31d-4ed5-85ad-6fbbf49c013a	49fb59cc-2c0a-4111-8c6e-184732909fb9	+213551624021	otp	\N	Wassalni — votre code de connexion : 550453. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-8e8b5317-a619-4338-bc52-2685434648b8	\N	2026-10-05 08:24:14.128971+00
cb928e3b-6ca4-4dc5-b486-99190f6e6e1e	49fb59cc-2c0a-4111-8c6e-184732909fb9	+213551624021	otp	\N	Wassalni — votre code de connexion : 582128. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-d89bfa02-f5e6-4d8d-a884-f4a7c0fd7bd1	\N	2026-10-05 08:24:37.666991+00
a5192f94-3539-458a-ac12-70901e6a0eba	7e0b2e76-ba25-48e5-b0a4-70adf37680a2	+213550624021	otp	\N	Wassalni — votre code de connexion : 373631. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-209b6e75-5329-4266-af89-031bbc19bf8c	\N	2026-10-05 08:24:52.625313+00
5f2f032a-0bbe-4eea-8309-172c71087b10	bff9583f-85ff-458a-9a3c-be0c013d0ead	+213552624021	otp	\N	Wassalni — votre code de connexion : 675428. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-bdc07ecd-ec78-48fe-a919-5f0d699f6f39	\N	2026-10-05 08:26:27.129207+00
cbcb4d3f-4fa6-4e0f-a827-1a147ee89b4d	4c472a1d-1e1f-45c1-be61-656b5aca6d13	+213554624021	otp	\N	Wassalni — votre code de connexion : 828571. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-5f708e14-0085-4c0e-b38d-9c3fc7ef63cf	\N	2026-10-05 08:28:12.807384+00
2fc0a234-9b9c-4ef7-83a9-9af5adc58157	49fb59cc-2c0a-4111-8c6e-184732909fb9	+213551624021	notification	809072d5-1630-4cd9-8778-31e162740c21	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101077 est en attente de confirmation.	sent	sandbox-996026d3-1f78-44b8-af17-f66c767ec01b	\N	2026-10-05 08:28:41.936982+00
89677a9d-d2ac-4e25-bc53-09e529fde9f8	49fb59cc-2c0a-4111-8c6e-184732909fb9	+213551624021	notification	809072d5-1630-4cd9-8778-31e162740c21	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101077 est en attente de confirmation.	sent	sandbox-903bf2c9-bcc3-4b41-a9b4-4aa0b3b6697c	\N	2026-10-05 08:28:43.221417+00
cf6c68ff-797c-459a-8a49-f57275c9229d	61b6b432-5c93-47e3-ae8f-486f3973beff	+213555624021	otp	\N	Wassalni — votre code de connexion : 215391. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-f0b1724c-fc55-48a5-8474-a53c9207591a	\N	2026-10-05 08:29:03.665176+00
25d7db11-ac71-4b1f-b14e-66deea2eae05	49fb59cc-2c0a-4111-8c6e-184732909fb9	+213551624021	notification	89d2341f-9aa9-4704-8441-2eeebfe9ca15	Wassalni — Réservation confirmée : Votre réservation RES-202610-101077 a été confirmée par le chauffeur.	sent	sandbox-d0527c74-2059-42a0-85c0-9ac6f996b148	\N	2026-10-05 08:29:21.868365+00
63c44a1c-8f60-43cb-99d2-e27677739531	49fb59cc-2c0a-4111-8c6e-184732909fb9	+213551624021	notification	89d2341f-9aa9-4704-8441-2eeebfe9ca15	Wassalni — Réservation confirmée : Votre réservation RES-202610-101077 a été confirmée par le chauffeur.	sent	sandbox-fc798f21-e6ca-49c8-9c66-e3fafcdb88f3	\N	2026-10-05 08:29:22.707018+00
a58b51ce-6cae-4608-b1d9-ffc316c17f7d	49fb59cc-2c0a-4111-8c6e-184732909fb9	+213551624021	notification	cc83f851-c366-4c8d-8057-f890eeddda80	Wassalni — Réservation annulée : Votre réservation RES-202610-101077 a été annulée.	sent	sandbox-586b5330-4300-4b41-a5cd-0c70a227acc6	\N	2026-10-05 08:30:01.974909+00
19a0f7a8-8a22-454b-8e17-f64f9fd42b54	49fb59cc-2c0a-4111-8c6e-184732909fb9	+213551624021	notification	cc83f851-c366-4c8d-8057-f890eeddda80	Wassalni — Réservation annulée : Votre réservation RES-202610-101077 a été annulée.	sent	sandbox-ebe3d9d0-a6d5-402f-be50-e419317efd69	\N	2026-10-05 08:30:03.038671+00
f70e8fa3-c713-4f9d-8fb4-abe255b5d569	27cdf3f7-0927-4db1-8032-4a92dc86d97f	+213560375974	otp	\N	Wassalni — votre code de connexion : 566661. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-7035555e-6448-44ad-b7a5-4b960df3b5a5	\N	2026-10-05 08:36:33.471187+00
103e749a-d07e-475b-87a4-65bf98ed22d8	1de087b8-743d-454c-a83d-63a0d8d7a5ca	+213561375974	otp	\N	Wassalni — votre code de connexion : 166832. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-2e637d5e-77c0-4e7f-a1c7-01b2adf72235	\N	2026-10-05 08:37:00.930196+00
ce75597e-62c0-48d3-81c8-1700c64bb11e	d099b557-a5c6-4943-ae2e-36b01e299e70	+213562375974	otp	\N	Wassalni — votre code de connexion : 181796. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-596d907a-1751-4c46-a380-e9dbbf544187	\N	2026-10-05 08:38:14.014828+00
e00909c6-c451-4e41-89f3-497132a33d5e	5e9914d2-3cf3-4c40-9322-e69a6c6fb87d	+213563375974	otp	\N	Wassalni — votre code de connexion : 334561. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-d1955928-5f2e-4137-b0fb-23507f49ce67	\N	2026-10-05 08:38:32.378358+00
ab30c3da-38d4-4545-9573-89a52db84764	e9fb6a6e-ae7e-435e-b982-9435460a074d	+213564375974	otp	\N	Wassalni — votre code de connexion : 896531. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-f9a3791a-09fe-43e8-a2b5-7ea7e571cadd	\N	2026-10-05 08:38:51.961405+00
a51c2e90-e705-442a-ab1c-de89bc949c9e	f1ebea60-f6e5-4bfc-85a5-3e7d4561c3bb	+213565375974	otp	\N	Wassalni — votre code de connexion : 661719. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-d2ab7f43-1b35-420d-aae9-a1f54812e13c	\N	2026-10-05 08:39:10.359114+00
633f2244-aae0-4cf3-a289-a1448be9aed1	d099b557-a5c6-4943-ae2e-36b01e299e70	+213562375974	notification	17cfd5bd-9dc0-42a8-bc75-40279364649b	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101085 est en attente de confirmation.	sent	sandbox-c0eb2c35-8db7-403e-895c-cb1e07f6631c	\N	2026-10-05 08:39:21.67272+00
ddc558dd-60a7-4e3a-b980-4734fd49ee18	d099b557-a5c6-4943-ae2e-36b01e299e70	+213562375974	notification	17cfd5bd-9dc0-42a8-bc75-40279364649b	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101085 est en attente de confirmation.	sent	sandbox-ac5d4857-683d-4dad-94d5-b688fb1d8288	\N	2026-10-05 08:39:22.165814+00
7837e2d2-70c2-466c-b11d-836c127f88cf	5e9914d2-3cf3-4c40-9322-e69a6c6fb87d	+213563375974	notification	563f3ce9-26b1-432f-a444-e4f00a384fc0	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101086 est en attente de confirmation.	sent	sandbox-d7f7c008-4745-4d1d-9bd2-53bece1f45b4	\N	2026-10-05 08:39:41.643068+00
244e116e-08ce-47da-a961-c558ad45ec38	5e9914d2-3cf3-4c40-9322-e69a6c6fb87d	+213563375974	notification	563f3ce9-26b1-432f-a444-e4f00a384fc0	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101086 est en attente de confirmation.	sent	sandbox-b7c7996a-4a1e-4541-870c-a197f67e82af	\N	2026-10-05 08:39:42.202044+00
dcf07fc7-cc01-48da-b77f-437ddbefb642	e9fb6a6e-ae7e-435e-b982-9435460a074d	+213564375974	notification	b2c70e43-a9d4-47a6-bce6-380d850ff635	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101087 est en attente de confirmation.	sent	sandbox-eeac9918-6e3a-4b7d-9196-ed8cffcaf55e	\N	2026-10-05 08:39:42.916388+00
466aa387-05c5-4fb1-91f4-07b208c74c74	e9fb6a6e-ae7e-435e-b982-9435460a074d	+213564375974	notification	b2c70e43-a9d4-47a6-bce6-380d850ff635	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101087 est en attente de confirmation.	sent	sandbox-e52816b5-5799-47f3-bc87-21a26e10744c	\N	2026-10-05 08:39:43.471685+00
20793e92-2a7f-4f61-be06-e894a876ac3a	f1ebea60-f6e5-4bfc-85a5-3e7d4561c3bb	+213565375974	notification	48dc6845-02fd-4909-ab06-54bba1d50223	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101088 est en attente de confirmation.	sent	sandbox-1f068ec6-1c51-4672-9347-0527ad95a05c	\N	2026-10-05 08:39:44.204887+00
ca0c74fa-1b21-42aa-b9a8-686ed8775c74	f1ebea60-f6e5-4bfc-85a5-3e7d4561c3bb	+213565375974	notification	48dc6845-02fd-4909-ab06-54bba1d50223	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101088 est en attente de confirmation.	sent	sandbox-02ed5e12-565c-4e28-946c-fa2299cf0acb	\N	2026-10-05 08:39:44.781279+00
7351a9e4-9de2-4535-8a22-ca1561a7e312	d099b557-a5c6-4943-ae2e-36b01e299e70	+213562375974	notification	b7fdd350-4057-4b4a-8d91-3f3dc2457d3b	Wassalni — Réservation confirmée : Votre réservation RES-202610-101085 a été confirmée par le chauffeur.	sent	sandbox-dccfab17-662d-4df6-87fb-be55113e1294	\N	2026-10-05 08:39:46.088569+00
9051e2ad-b0c0-4de6-a6e1-ffe21b85b36d	5e9914d2-3cf3-4c40-9322-e69a6c6fb87d	+213563375974	notification	d5915ac7-b144-4521-af79-f6176dcc7c4c	Wassalni — Réservation confirmée : Votre réservation RES-202610-101086 a été confirmée par le chauffeur.	sent	sandbox-c29c43fd-0b8b-4468-aedf-ef4920f61576	\N	2026-10-05 08:40:01.611244+00
c41473d3-8b15-4d83-b679-1e7318cc6e75	5e9914d2-3cf3-4c40-9322-e69a6c6fb87d	+213563375974	notification	d5915ac7-b144-4521-af79-f6176dcc7c4c	Wassalni — Réservation confirmée : Votre réservation RES-202610-101086 a été confirmée par le chauffeur.	sent	sandbox-d06bd483-f4db-4f6f-af37-0a936bd8f70f	\N	2026-10-05 08:40:02.274008+00
a7c2e093-2e0c-4fd6-b853-2a074eedb6f1	e9fb6a6e-ae7e-435e-b982-9435460a074d	+213564375974	notification	f8905544-6107-444d-b53a-1635bddefd9c	Wassalni — Réservation confirmée : Votre réservation RES-202610-101087 a été confirmée par le chauffeur.	sent	sandbox-c5242c00-93cc-4b58-a06b-d1229a7081a5	\N	2026-10-05 08:40:02.947723+00
fbcc1336-9a4e-4553-aa75-028ecd1eb7b9	e9fb6a6e-ae7e-435e-b982-9435460a074d	+213564375974	notification	f8905544-6107-444d-b53a-1635bddefd9c	Wassalni — Réservation confirmée : Votre réservation RES-202610-101087 a été confirmée par le chauffeur.	sent	sandbox-80cd8ec5-ce8e-4dba-a783-4ea98324307f	\N	2026-10-05 08:40:03.672727+00
25c85dc5-d189-46e7-9664-446f360dddd0	f1ebea60-f6e5-4bfc-85a5-3e7d4561c3bb	+213565375974	notification	c5de1970-131c-462b-895b-22e57f58b665	Wassalni — Réservation confirmée : Votre réservation RES-202610-101088 a été confirmée par le chauffeur.	sent	sandbox-6040fd51-d8e0-4e30-a199-fd1f001e65ca	\N	2026-10-05 08:40:04.247159+00
c205a054-f4ce-40c9-90a9-a098075a171b	f1ebea60-f6e5-4bfc-85a5-3e7d4561c3bb	+213565375974	notification	c5de1970-131c-462b-895b-22e57f58b665	Wassalni — Réservation confirmée : Votre réservation RES-202610-101088 a été confirmée par le chauffeur.	sent	sandbox-137df0ed-47f1-4e7b-b53e-a28e78e5f947	\N	2026-10-05 08:40:04.995378+00
533798a2-bf42-4119-9e53-775b50e39cc9	5e9914d2-3cf3-4c40-9322-e69a6c6fb87d	+213563375974	notification	8ab4c5da-c778-46a9-8dd3-005f4cb9df2e	Wassalni — Paiement confirmé : Votre paiement de 500.00 DZD pour la réservation RES-202610-101086 a été confirmé.	sent	sandbox-42ab556e-9f7c-436c-bbff-2a6695963a12	\N	2026-10-05 08:40:21.501123+00
d113354c-5771-4a1d-bebd-1e39a33fc5ca	5e9914d2-3cf3-4c40-9322-e69a6c6fb87d	+213563375974	notification	8ab4c5da-c778-46a9-8dd3-005f4cb9df2e	Wassalni — Paiement confirmé : Votre paiement de 500.00 DZD pour la réservation RES-202610-101086 a été confirmé.	sent	sandbox-44b2310e-6f75-4644-9e19-b3583c70e67b	\N	2026-10-05 08:40:22.239935+00
e0c25837-3a58-460a-9681-5ab540572219	e9fb6a6e-ae7e-435e-b982-9435460a074d	+213564375974	notification	07630b66-8efb-4be6-84ab-a2dd27970cc9	Wassalni — Réservation annulée : Votre réservation RES-202610-101087 a été annulée.	sent	sandbox-36424dd7-e27e-40e6-898b-b58de3659064	\N	2026-10-05 08:41:01.563362+00
949ac783-13fb-493c-b53f-bdad64e63c13	e9fb6a6e-ae7e-435e-b982-9435460a074d	+213564375974	notification	07630b66-8efb-4be6-84ab-a2dd27970cc9	Wassalni — Réservation annulée : Votre réservation RES-202610-101087 a été annulée.	sent	sandbox-fc8aeea0-ae7b-481b-9ba1-1ce9d19c6a26	\N	2026-10-05 08:41:02.253773+00
70feca14-4125-422f-b27e-39e3a4406559	b678e16b-1c9c-4dee-82ee-6ed88d1db99c	+213551442704	otp	\N	Wassalni — votre code de connexion : 763618. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-80d71845-35f2-4efd-8f19-01509c6d6548	\N	2026-10-05 13:37:52.026336+00
c6b1e251-336a-4df8-8749-3463c7191730	b678e16b-1c9c-4dee-82ee-6ed88d1db99c	+213551442704	otp	\N	Wassalni — votre code de connexion : 776506. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-dfc684a2-1ad8-4967-9a1b-082e9158c6cb	\N	2026-10-05 13:38:18.537428+00
7b106079-88ec-4700-867b-dbb8f868d1e8	72b1dfb3-a6bd-49f8-aeda-19e28437a3bd	+213550442704	otp	\N	Wassalni — votre code de connexion : 844019. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-c3a9a8ef-3f7e-4a98-a50d-3c317c7bfe18	\N	2026-10-05 13:38:39.277248+00
ce19c830-9526-446b-b8ed-1203c3c54fb4	d6913794-9ba1-43b2-9610-11024dc5ed11	+213552442704	otp	\N	Wassalni — votre code de connexion : 952031. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-10751cf0-6c9f-4a6a-b011-18a26933c884	\N	2026-10-05 13:39:19.236616+00
96f8b3b2-736c-4103-8ac0-93dcb539dd07	dcb36b0d-d731-46ac-bd3e-71f8de5289db	+213554442704	otp	\N	Wassalni — votre code de connexion : 599158. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-b4dd7216-96c8-4e4b-a4a5-1ec0c8274eb5	\N	2026-10-05 13:41:22.780373+00
7380df54-63d6-4e6c-a9bc-d1d7aebb13bd	b678e16b-1c9c-4dee-82ee-6ed88d1db99c	+213551442704	notification	eb0727b9-2c54-4304-ac02-f5fd6b228219	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101142 est en attente de confirmation.	sent	sandbox-d8d338bb-03ad-4396-9984-2db54977de62	\N	2026-10-05 13:41:57.16098+00
3dd132ff-529e-4f67-99a3-b20a9d1aaa54	29beb8fd-8f89-41c4-b2ad-df4bbe8767b6	+213555442704	otp	\N	Wassalni — votre code de connexion : 477626. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-dbcd1afd-98d3-432c-b099-89c238b0300c	\N	2026-10-05 13:42:24.625852+00
109aeba8-e83a-4b3a-bf84-9a61f3531650	b678e16b-1c9c-4dee-82ee-6ed88d1db99c	+213551442704	notification	78c3036b-c636-4a10-b49f-f20ad15b007a	Wassalni — Réservation confirmée : Votre réservation RES-202610-101142 a été confirmée par le chauffeur.	sent	sandbox-3f361a62-2b76-456b-8f2a-e01f963c4d8f	\N	2026-10-05 13:42:46.979439+00
e0b40227-d0e5-4b48-812d-e611babb889d	b678e16b-1c9c-4dee-82ee-6ed88d1db99c	+213551442704	notification	d1777693-f5b1-4a49-b640-1f81a8e873e9	Wassalni — Réservation annulée : Votre réservation RES-202610-101142 a été annulée.	sent	sandbox-dc52b611-68ef-4215-9bb1-d3661ae1b192	\N	2026-10-05 13:43:16.927135+00
506dfc4f-6bef-4598-93e9-7dbf880e1253	29a82d95-1b8e-4b6a-a08e-a5983725a324	+213560894918	otp	\N	Wassalni — votre code de connexion : 275642. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-399c835f-bda0-41da-acef-46cbb039982e	\N	2026-10-05 13:45:18.808664+00
65765a81-4702-4bb5-a2dd-f1912b9dde7a	cb0f77ff-95b4-4d03-83e9-67508de2ca4a	+213561894918	otp	\N	Wassalni — votre code de connexion : 156804. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-38c8ce01-38cb-47d6-bd06-a773e3826a54	\N	2026-10-05 13:45:49.767776+00
52c2de25-325f-4c88-a868-63f95a6ba3cb	6bd2f8c8-dd03-4236-a3e9-dea534b840be	+213562894918	otp	\N	Wassalni — votre code de connexion : 961933. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-ff18a6da-bdc8-47d7-b4b8-21f1e79bb6a3	\N	2026-10-05 13:47:11.826784+00
c81334c4-91a1-4ef7-9ec6-852d3f5aa53a	49c38585-89e8-4a75-91a6-7bdccae35f45	+213563894918	otp	\N	Wassalni — votre code de connexion : 284913. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-1f3fd636-4d59-4e66-91ad-98873879938b	\N	2026-10-05 13:47:31.204805+00
3eb24a71-83a3-4110-bd5d-8c8fc2f56d63	e36cccc6-b3db-4a9c-a669-d175381b60e0	+213564894918	otp	\N	Wassalni — votre code de connexion : 569667. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-ec020b36-59da-4e39-9cf5-b642486b8969	\N	2026-10-05 13:47:49.872029+00
f26dd9c6-dc0e-4330-a92b-be7960f1e537	85f97463-c727-4d28-8c22-ba12cdd31288	+213565894918	otp	\N	Wassalni — votre code de connexion : 792505. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-d862bbee-65cd-41be-a62b-2328bc41f862	\N	2026-10-05 13:48:11.563293+00
7e38792b-d4c6-4e57-a399-876b285a3c35	6bd2f8c8-dd03-4236-a3e9-dea534b840be	+213562894918	notification	8da28612-48c0-4e52-9afe-22a0d5c7a451	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101194 est en attente de confirmation.	sent	sandbox-1434238f-5c73-4523-88e5-f5556a2d3ceb	\N	2026-10-05 13:48:26.833276+00
889fec6f-a4de-4d29-8366-2477ad6050a9	49c38585-89e8-4a75-91a6-7bdccae35f45	+213563894918	notification	2197726f-9304-4e9d-afc3-52c01749a362	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101197 est en attente de confirmation.	sent	sandbox-9ab2e542-665b-4572-8714-4c2869d4a067	\N	2026-10-05 13:48:37.000013+00
96e97f5e-fc81-4095-9d7a-28e407f65933	e36cccc6-b3db-4a9c-a669-d175381b60e0	+213564894918	notification	c3371f44-db17-4533-a6cf-e77c61fb5894	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101198 est en attente de confirmation.	sent	sandbox-a4d26633-7fe0-4334-bac3-8c698ce3cf6c	\N	2026-10-05 13:48:38.322464+00
0caa722f-5e6d-4527-bb83-e85ccb897d02	85f97463-c727-4d28-8c22-ba12cdd31288	+213565894918	notification	ffd1fe2f-72fd-4ddf-aab7-5ca0862716a6	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101199 est en attente de confirmation.	sent	sandbox-ab9c8c15-1d51-4519-85e0-397a0accbeef	\N	2026-10-05 13:48:46.768708+00
3f6c9001-4537-4f50-b981-6436faa94dc5	6bd2f8c8-dd03-4236-a3e9-dea534b840be	+213562894918	notification	0bd28180-0c73-4375-847e-425aace4eecb	Wassalni — Réservation confirmée : Votre réservation RES-202610-101194 a été confirmée par le chauffeur.	sent	sandbox-ed0efaab-6a63-4f2a-b247-03263623f8f2	\N	2026-10-05 13:48:48.105948+00
30899880-71bb-421a-97e7-75d2b19caa34	49c38585-89e8-4a75-91a6-7bdccae35f45	+213563894918	notification	bbde8f78-77cb-4627-a40b-3c4429baf191	Wassalni — Réservation confirmée : Votre réservation RES-202610-101197 a été confirmée par le chauffeur.	sent	sandbox-b678d534-44ec-47e8-bff0-7126aeb95ce2	\N	2026-10-05 13:49:56.942848+00
83d8e1d0-2d99-454a-b7d1-9cd3b6695798	e36cccc6-b3db-4a9c-a669-d175381b60e0	+213564894918	notification	727dcc42-1a31-4067-91ea-5c1a71cb651e	Wassalni — Réservation confirmée : Votre réservation RES-202610-101198 a été confirmée par le chauffeur.	sent	sandbox-08a78cf6-4351-40c0-86ed-f98459b721ff	\N	2026-10-05 13:49:58.286455+00
056ef897-3bc1-4b7a-9d49-9bd067cbfb6f	042a18db-67bb-4fef-b29f-6a5a749f0697	+213560368113	otp	\N	Wassalni — votre code de connexion : 632416. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-e9a31f28-b672-405d-94c8-95af30e2c381	\N	2026-10-05 13:53:04.898872+00
94e80753-ce05-46f8-b668-53d558ef7495	9bb76c9f-b3b9-46e2-8dcd-d5a1988d4291	+213561368113	otp	\N	Wassalni — votre code de connexion : 532043. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-51d5855a-e229-4c22-91fe-7f1beb436dd6	\N	2026-10-05 13:53:31.882673+00
f9ecf040-67f9-481b-a263-c44e12220d24	601654de-c410-4106-b455-169cc24439f2	+213560758083	otp	\N	Wassalni — votre code de connexion : 187233. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-232f7ccc-0b36-4ab3-95bb-e7683fcbca67	\N	2026-10-05 13:59:34.764269+00
93a5c150-5fc9-4437-87e5-65e9d45343d2	daec7cf5-3df5-4b34-8808-17a88d29ab10	+213561758083	otp	\N	Wassalni — votre code de connexion : 640150. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-c4ae20f8-73e8-430a-98aa-729fd84d415a	\N	2026-10-05 14:00:05.739065+00
a273d2de-d4e1-4d0f-a370-d4aa6077870b	8e88ceba-5892-4e4f-9946-14596306582c	+213562758083	otp	\N	Wassalni — votre code de connexion : 163221. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-1623b971-76e9-42da-a5ed-e7e78482c86a	\N	2026-10-05 14:01:36.396991+00
b79c8be9-cc9b-47b8-b042-ced5346ecee6	56ad3ded-caed-4c51-ba2e-ff4027aec484	+213563758083	otp	\N	Wassalni — votre code de connexion : 508484. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-7b8b4cbf-76a5-4be2-a34b-55b3d8cf1aee	\N	2026-10-05 14:01:55.700956+00
331f3b4f-a7a2-4766-b036-6d9e2c56d3ec	65cf9374-7cd2-47fd-9a9e-da1466c31170	+213564758083	otp	\N	Wassalni — votre code de connexion : 777811. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-d5feaa0e-959c-47b3-b872-51c347c15e37	\N	2026-10-05 14:02:17.261815+00
8ca04cb5-f954-44ad-96cb-37ccfd6bb377	3b85b96f-9556-4102-8b40-9c714bd92df2	+213565758083	otp	\N	Wassalni — votre code de connexion : 275509. Expire dans 10 min. Ne le partagez avec personne.	sent	sandbox-da635db7-e54c-420e-ae40-36165d10b586	\N	2026-10-05 14:02:37.724381+00
1a187491-cd72-4011-ae87-869028a14841	8e88ceba-5892-4e4f-9946-14596306582c	+213562758083	notification	388d471e-a166-4864-b36d-2ce07c7ad9aa	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101207 est en attente de confirmation.	sent	sandbox-f124320d-1eb4-46e6-a406-883925956ac0	\N	2026-10-05 14:02:57.18007+00
914987dd-16bd-42e6-855b-b9a800fdf480	56ad3ded-caed-4c51-ba2e-ff4027aec484	+213563758083	notification	e8784033-543d-406a-9209-0503dd7daa44	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101208 est en attente de confirmation.	sent	sandbox-983c2263-a9ed-4ee8-b770-abd9b0bff036	\N	2026-10-05 14:02:58.52852+00
dd4a229f-b01c-4d80-aac2-53c83f58fdbb	65cf9374-7cd2-47fd-9a9e-da1466c31170	+213564758083	notification	333bc47e-a2e3-4ecc-a106-a4685f982dfe	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101209 est en attente de confirmation.	sent	sandbox-e3819bde-f95f-4f99-a877-0aaa2a34e429	\N	2026-10-05 14:03:07.115865+00
14dbdd6b-211f-43de-ba00-28468908626e	3b85b96f-9556-4102-8b40-9c714bd92df2	+213565758083	notification	aafc37e9-1dd4-4631-9756-3a2cf6a1f026	Wassalni — Demande de réservation envoyée : Votre demande de réservation RES-202610-101210 est en attente de confirmation.	sent	sandbox-9e167953-feef-46cc-b3a7-17ebe26ba7a9	\N	2026-10-05 14:03:08.610989+00
c8869799-4c71-4cd5-becb-fe120eca4882	8e88ceba-5892-4e4f-9946-14596306582c	+213562758083	notification	54898594-780c-4348-840a-828036ab7ae3	Wassalni — Réservation confirmée : Votre réservation RES-202610-101207 a été confirmée par le chauffeur.	sent	sandbox-5d36348c-7d85-4a5d-85b5-244539a667f2	\N	2026-10-05 14:03:17.144599+00
c4719166-62fc-4279-97ed-83981853a882	56ad3ded-caed-4c51-ba2e-ff4027aec484	+213563758083	notification	312c2bdb-9af1-4000-aaeb-81bbbe2b2d58	Wassalni — Réservation confirmée : Votre réservation RES-202610-101208 a été confirmée par le chauffeur.	sent	sandbox-101e4299-6219-4f61-9fe7-3b1b8c3b76fa	\N	2026-10-05 14:03:18.682283+00
d079f42d-9ded-450d-84f9-e4fd25593cf6	65cf9374-7cd2-47fd-9a9e-da1466c31170	+213564758083	notification	b21f5258-f987-4f75-960c-386522f7bf04	Wassalni — Réservation confirmée : Votre réservation RES-202610-101209 a été confirmée par le chauffeur.	sent	sandbox-5aa08abf-53c5-4ead-846b-e37b7e4ccda9	\N	2026-10-05 14:03:27.063474+00
365a579e-166e-4137-adad-077ffb126700	3b85b96f-9556-4102-8b40-9c714bd92df2	+213565758083	notification	a894a670-8fd4-4702-a8ca-5d13396a5e29	Wassalni — Réservation confirmée : Votre réservation RES-202610-101210 a été confirmée par le chauffeur.	sent	sandbox-e6d68ca2-edda-4374-9ffd-a6bdaf7a68a5	\N	2026-10-05 14:03:28.349412+00
b4bd353d-6d00-4e86-a03d-e20d7c8a5444	56ad3ded-caed-4c51-ba2e-ff4027aec484	+213563758083	notification	c4807dc6-c047-418d-b75c-daa02576a325	Wassalni — Paiement confirmé : Votre paiement de 500.00 DZD pour la réservation RES-202610-101208 a été confirmé.	sent	sandbox-e2fd0ef1-3a14-478a-a9f7-38c3bfee1554	\N	2026-10-05 14:03:47.143559+00
fdecc179-4ee7-47d3-90a4-914aa27de8e6	65cf9374-7cd2-47fd-9a9e-da1466c31170	+213564758083	notification	f300880a-9fdd-479a-ba56-ac584baf4dd4	Wassalni — Réservation annulée : Votre réservation RES-202610-101209 a été annulée.	sent	sandbox-30b1f3ae-5d5b-4ae3-ab37-af147f71dcbe	\N	2026-10-05 14:04:17.212121+00
\.


--
-- Data for Name: sos_event; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."sos_event" ("id", "reservation_id", "trip_id", "triggered_by_role", "triggered_by_id", "gps_lat", "gps_lon", "status", "notes", "resolved_at", "resolved_by", "created_at") FROM stdin;
0eae3866-1db6-4c12-a1e3-90f7c1d313b4	\N	\N	customer	5d181db1-6d9f-4dfa-b9ae-7215318eec08	36.750000	3.060000	open	test	\N	\N	2026-10-04 18:38:53.737706+00
a62978b6-fc3e-4308-bc54-a7075ecf5748	\N	\N	customer	3aa2c9e5-3c34-4658-ad82-ef3265b17ecf	\N	\N	resolved	resolved by smoke test	2026-10-04 18:50:04.304175+00	7be40049-a06f-4a22-8fbe-a3499fbc9386	2026-10-04 18:49:58.833563+00
5f1f35b1-05b5-4b85-8ee5-c38c98cd569d	\N	\N	driver	46146536-85db-42d6-9dd0-af396fef94ce	\N	\N	open	driver smoke sos	\N	\N	2026-10-04 18:50:33.127871+00
0a75a9a0-9aae-48f3-943f-d2c860a874e3	\N	\N	customer	3aa2c9e5-3c34-4658-ad82-ef3265b17ecf	\N	\N	resolved	resolved by smoke test	2026-10-04 18:51:05.398013+00	7be40049-a06f-4a22-8fbe-a3499fbc9386	2026-10-04 18:51:00.060388+00
9d4b3e5b-55ba-445c-9ff2-2d12de747759	\N	\N	customer	3aa2c9e5-3c34-4658-ad82-ef3265b17ecf	\N	\N	resolved	resolved by smoke test	2026-10-04 18:52:36.13095+00	7be40049-a06f-4a22-8fbe-a3499fbc9386	2026-10-04 18:52:30.800998+00
7e86be72-6bb6-4863-bb06-72274c4ddab1	\N	\N	driver	46146536-85db-42d6-9dd0-af396fef94ce	\N	\N	open	driver smoke sos	\N	\N	2026-10-04 18:53:06.738962+00
71b16b40-24c6-47df-b01b-9f9447f8584e	\N	\N	driver	46146536-85db-42d6-9dd0-af396fef94ce	\N	\N	resolved	resolved by smoke test	2026-10-04 19:18:54.536377+00	7be40049-a06f-4a22-8fbe-a3499fbc9386	2026-10-04 19:06:49.63925+00
8d59f42b-12d5-4c89-b550-ded287e5aeba	\N	5aa4485e-c7bf-4e14-8b6f-f5fdc61481a3	customer	5d181db1-6d9f-4dfa-b9ae-7215318eec08	36.750000	3.060000	resolved	smoke-resolved	2026-10-04 19:18:36.536802+00	5d181db1-6d9f-4dfa-b9ae-7215318eec08	2026-10-04 19:18:33.312992+00
\.


--
-- Data for Name: trip_stop; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."trip_stop" ("trip_id", "trajectory_id", "wpoint_id", "eta") FROM stdin;
8e0c8db7-735a-46a4-9268-fe0b50c8041c	1ff60fe5-d00e-44a2-ae20-8da995235d22	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	\N
8e0c8db7-735a-46a4-9268-fe0b50c8041c	1ff60fe5-d00e-44a2-ae20-8da995235d22	411663d0-a8ad-4931-96b2-a1813e033ba9	\N
24377111-e9e7-405f-9d6d-9141269a5fc0	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	7929afdd-3d86-4e84-8f57-e404dc282a9b	\N
24377111-e9e7-405f-9d6d-9141269a5fc0	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	96245ba9-b871-48c9-bdc2-4b64cd5a7f84	\N
24377111-e9e7-405f-9d6d-9141269a5fc0	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	82b9d1cf-5df2-4748-95e2-79e5e5650375	\N
24377111-e9e7-405f-9d6d-9141269a5fc0	2c7ee85d-98fa-4b86-9520-57a0d08ecf93	784205d9-89fc-4fb6-9608-93d7fff800be	\N
3bccde4f-05f6-416a-a810-aa89c1a4ddaf	1ff60fe5-d00e-44a2-ae20-8da995235d22	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	\N
3bccde4f-05f6-416a-a810-aa89c1a4ddaf	1ff60fe5-d00e-44a2-ae20-8da995235d22	411663d0-a8ad-4931-96b2-a1813e033ba9	\N
4aca8903-f346-4717-8f43-02d95ac2bf68	1ff60fe5-d00e-44a2-ae20-8da995235d22	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	\N
4aca8903-f346-4717-8f43-02d95ac2bf68	1ff60fe5-d00e-44a2-ae20-8da995235d22	411663d0-a8ad-4931-96b2-a1813e033ba9	\N
5891e185-05a6-42ab-bcde-ba6126cd819d	1ff60fe5-d00e-44a2-ae20-8da995235d22	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	\N
5891e185-05a6-42ab-bcde-ba6126cd819d	1ff60fe5-d00e-44a2-ae20-8da995235d22	411663d0-a8ad-4931-96b2-a1813e033ba9	\N
713c51d0-d69f-4263-a1f0-152b7e1afb7a	1ff60fe5-d00e-44a2-ae20-8da995235d22	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	\N
713c51d0-d69f-4263-a1f0-152b7e1afb7a	1ff60fe5-d00e-44a2-ae20-8da995235d22	411663d0-a8ad-4931-96b2-a1813e033ba9	\N
26250ac8-e532-4ac4-813e-15e4758e706d	1ff60fe5-d00e-44a2-ae20-8da995235d22	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	\N
26250ac8-e532-4ac4-813e-15e4758e706d	1ff60fe5-d00e-44a2-ae20-8da995235d22	411663d0-a8ad-4931-96b2-a1813e033ba9	\N
5aa4485e-c7bf-4e14-8b6f-f5fdc61481a3	1ff60fe5-d00e-44a2-ae20-8da995235d22	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	\N
5aa4485e-c7bf-4e14-8b6f-f5fdc61481a3	1ff60fe5-d00e-44a2-ae20-8da995235d22	411663d0-a8ad-4931-96b2-a1813e033ba9	\N
7e2fa372-ab35-4dc8-86af-f7bb40d2c2fb	1ff60fe5-d00e-44a2-ae20-8da995235d22	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	\N
7e2fa372-ab35-4dc8-86af-f7bb40d2c2fb	1ff60fe5-d00e-44a2-ae20-8da995235d22	411663d0-a8ad-4931-96b2-a1813e033ba9	\N
b70bde5c-fe9b-4044-9f98-25a35d246341	1ff60fe5-d00e-44a2-ae20-8da995235d22	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	\N
b70bde5c-fe9b-4044-9f98-25a35d246341	1ff60fe5-d00e-44a2-ae20-8da995235d22	411663d0-a8ad-4931-96b2-a1813e033ba9	\N
2d47e28b-69d9-4700-9602-83ceee458afd	1ff60fe5-d00e-44a2-ae20-8da995235d22	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	\N
2d47e28b-69d9-4700-9602-83ceee458afd	1ff60fe5-d00e-44a2-ae20-8da995235d22	411663d0-a8ad-4931-96b2-a1813e033ba9	\N
\.


--
-- Data for Name: trip_price; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."trip_price" ("trip_id", "from_wpoint_id", "to_wpoint_id", "currency", "price", "min_price", "max_price", "notes", "created_at", "updated_at") FROM stdin;
8e0c8db7-735a-46a4-9268-fe0b50c8041c	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	DZD	2500.00	\N	\N	\N	2026-10-02 20:00:32.92344+00	2026-10-02 20:00:32.92344+00
24377111-e9e7-405f-9d6d-9141269a5fc0	7929afdd-3d86-4e84-8f57-e404dc282a9b	784205d9-89fc-4fb6-9608-93d7fff800be	DZD	2300.00	\N	\N	\N	2026-10-03 19:39:30.68596+00	2026-10-03 19:39:30.68596+00
24377111-e9e7-405f-9d6d-9141269a5fc0	7929afdd-3d86-4e84-8f57-e404dc282a9b	82b9d1cf-5df2-4748-95e2-79e5e5650375	DZD	1500.00	\N	\N	\N	2026-10-03 19:39:30.68596+00	2026-10-03 19:39:30.68596+00
24377111-e9e7-405f-9d6d-9141269a5fc0	7929afdd-3d86-4e84-8f57-e404dc282a9b	96245ba9-b871-48c9-bdc2-4b64cd5a7f84	DZD	1900.00	\N	\N	\N	2026-10-03 19:39:30.68596+00	2026-10-03 19:39:30.68596+00
3bccde4f-05f6-416a-a810-aa89c1a4ddaf	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	DZD	2500.00	\N	\N	\N	2026-10-04 18:39:23.426627+00	2026-10-04 18:39:23.426627+00
4aca8903-f346-4717-8f43-02d95ac2bf68	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	DZD	2500.00	\N	\N	\N	2026-10-04 18:39:23.426627+00	2026-10-04 18:39:23.426627+00
5891e185-05a6-42ab-bcde-ba6126cd819d	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	DZD	2500.00	\N	\N	\N	2026-10-04 18:39:23.426627+00	2026-10-04 18:39:23.426627+00
713c51d0-d69f-4263-a1f0-152b7e1afb7a	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	DZD	2500.00	\N	\N	\N	2026-10-04 18:39:23.426627+00	2026-10-04 18:39:23.426627+00
26250ac8-e532-4ac4-813e-15e4758e706d	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	DZD	2500.00	\N	\N	\N	2026-10-04 18:39:23.426627+00	2026-10-04 18:39:23.426627+00
5aa4485e-c7bf-4e14-8b6f-f5fdc61481a3	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	DZD	2500.00	\N	\N	\N	2026-10-04 18:39:59.041815+00	2026-10-04 18:39:59.041815+00
2d47e28b-69d9-4700-9602-83ceee458afd	bd275fa3-6ef3-47c8-9b09-9d8d8b254287	411663d0-a8ad-4931-96b2-a1813e033ba9	DZD	2500.00	\N	\N	\N	2026-10-04 19:17:33.959614+00	2026-10-04 19:17:33.959614+00
\.


--
-- Data for Name: trip_share_token; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."trip_share_token" ("id", "reservation_id", "token_hash", "expires_at", "revoked_at", "created_at") FROM stdin;
71d64ce6-6292-4509-aa8d-b44a07971937	25a1bfd8-df98-4a39-a665-2e7542f632b3	1b7f4f333f163d6996d945a484171c46da9c788acc89fd460cb118a7470c91e7	2026-10-05 18:39:30.029241+00	2026-10-04 18:39:32.681423+00	2026-10-04 18:39:30.029241+00
af35b649-3681-4f2e-bc18-418f8a6d89ff	82758c6c-5522-406e-9723-86cc66d8ad46	ff7684cfd526f8c26c9b7ea6e016706aa022544a581986a11b51d6eede44ea08	2026-10-05 18:54:22.256534+00	2026-10-04 18:54:27.67552+00	2026-10-04 18:54:22.256534+00
8d3285db-10f9-4aff-bfdc-4a239c78d396	eb143532-030e-4913-9d1c-c082bd34ce0d	0f8f731250bd0faa1aed0963110e14dc6ab4c833a50e784793f3a342a221b36f	2026-10-05 18:56:01.973729+00	2026-10-04 18:56:07.445487+00	2026-10-04 18:56:01.973729+00
\.


--
-- Data for Name: vehicle_inspection; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."vehicle_inspection" ("id", "vehicle_id", "submitted_by_driver", "inspection_date", "expiry_date", "maintenance_status", "file_path", "file_name", "mime_type", "notes", "approval_state", "rejection_reason", "reviewed_by", "reviewed_at", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: vehicle_last_location; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."vehicle_last_location" ("vehicle_id", "gps_lat", "gps_lon", "recorded_at") FROM stdin;
bb180ef2-be2f-47b6-996b-18a4dc8f7a06	36.750000	3.060000	2026-10-03 19:18:53.577+00
\.


--
-- Data for Name: waitlist_entry; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."waitlist_entry" ("id", "trip_id", "customer_id", "seats", "pickup_wpoint_id", "dropoff_wpoint_id", "position", "status", "reservation_id", "created_at", "promoted_at", "cancelled_at") FROM stdin;
\.


--
-- Data for Name: wallet_entry; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."wallet_entry" ("id", "customer_id", "entry_type", "amount", "reservation_id", "reference_id", "description", "created_at") FROM stdin;
\.


--
-- Data for Name: wpoint_commune; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."wpoint_commune" ("wpoint_id", "wilaya_id", "commune_id", "sort_key", "added_at") FROM stdin;
e6a38cbe-ad08-43e1-8b12-9b059009171e	16	1942	3	2026-10-03 21:22:05.174349+00
e6a38cbe-ad08-43e1-8b12-9b059009171e	16	1943	4	2026-10-03 21:22:05.174349+00
e6a38cbe-ad08-43e1-8b12-9b059009171e	16	1944	5	2026-10-03 21:22:05.174349+00
e6a38cbe-ad08-43e1-8b12-9b059009171e	16	1935	6	2026-10-03 21:22:05.174349+00
e6a38cbe-ad08-43e1-8b12-9b059009171e	16	1936	7	2026-10-03 21:22:05.174349+00
e6a38cbe-ad08-43e1-8b12-9b059009171e	16	1940	8	2026-10-03 21:22:05.174349+00
e6a38cbe-ad08-43e1-8b12-9b059009171e	16	1937	9	2026-10-03 21:22:05.174349+00
e6a38cbe-ad08-43e1-8b12-9b059009171e	16	1938	10	2026-10-03 21:22:05.174349+00
e6a38cbe-ad08-43e1-8b12-9b059009171e	16	1939	11	2026-10-03 21:22:05.174349+00
15377f9a-ba4e-4b29-a9d4-0ee24fdb7d0a	17	2002	12	2026-10-03 21:27:32.336012+00
15377f9a-ba4e-4b29-a9d4-0ee24fdb7d0a	17	1988	13	2026-10-03 21:27:32.336012+00
5aa06e3a-4d66-4b12-8c8f-02063ae802ee	47	2776	14	2026-10-03 21:30:00.363373+00
5aa06e3a-4d66-4b12-8c8f-02063ae802ee	47	2775	15	2026-10-03 21:30:00.363373+00
5aa06e3a-4d66-4b12-8c8f-02063ae802ee	47	2782	16	2026-10-03 21:30:00.363373+00
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type", "versioning_status", "lifecycle_configuration", "lifecycle_configuration_generation") FROM stdin;
avatars	avatars	\N	2026-10-02 00:01:08.629944+00	2026-10-02 00:01:08.629944+00	t	f	\N	\N	\N	STANDARD	DISABLED	\N	\N
verification-documents	verification-documents	\N	2026-10-02 00:01:08.629944+00	2026-10-02 00:01:08.629944+00	f	f	\N	\N	\N	STANDARD	DISABLED	\N	\N
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_analytics" ("name", "type", "format", "created_at", "updated_at", "id", "deleted_at") FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."buckets_vectors" ("id", "type", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata", "archived_at", "is_delete_marker", "is_versioned") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads" ("id", "in_progress_size", "upload_signature", "bucket_id", "key", "version", "owner_id", "created_at", "user_metadata", "metadata") FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."s3_multipart_uploads_parts" ("id", "upload_id", "size", "part_number", "bucket_id", "key", "etag", "owner_id", "version", "created_at") FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY "storage"."vector_indexes" ("id", "name", "bucket_id", "data_type", "dimension", "distance_metric", "metadata_configuration", "created_at", "updated_at") FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 10, true);


--
-- Name: commune_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."commune_id_seq"', 2986, true);


--
-- Name: daira_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."daira_id_seq"', 1141, true);


--
-- Name: import_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."import_log_id_seq"', 1, true);


--
-- Name: seq_business_code; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."seq_business_code"', 101217, true);


--
-- Name: wpoint_commune_sort_key_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."wpoint_commune_sort_key_seq"', 44, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict n0swudxw4yHtJKCEERWaZ5ClusTw9f7ahwW5NtnBj0qFugHIDY6LaJWzfioqDrF

RESET ALL;
