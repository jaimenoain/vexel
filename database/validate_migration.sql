DO $$
DECLARE
    v_entity_id UUID;
    v_asset_id UUID;
BEGIN
    RAISE NOTICE 'Starting QA Review for Entities and Assets...';

    -- Test 1: Positive - Insert valid Entity and Asset
    RAISE NOTICE 'Test 1 (Positive): Inserting valid Entity and Asset...';

    -- Insert Entity "Smith Family"
    -- Relying on default type 'FAMILY'
    INSERT INTO public.entities (name)
    VALUES ('Smith Family')
    RETURNING id INTO v_entity_id;

    -- Insert Asset "Checking Account" with type 'BANK'
    INSERT INTO public.assets (name, entity_id, type)
    VALUES ('Checking Account', v_entity_id, 'BANK')
    RETURNING id INTO v_asset_id;

    RAISE NOTICE 'Test 1 Passed: Inserted Entity % and Asset %', v_entity_id, v_asset_id;

    -- Test 2: Negative - FK Violation
    RAISE NOTICE 'Test 2 (Negative - FK): Attempting to insert Asset with invalid entity_id...';
    BEGIN
        INSERT INTO public.assets (name, entity_id, type)
        VALUES ('Orphan Asset', '00000000-0000-0000-0000-000000000000', 'BANK');
        RAISE EXCEPTION 'Test 2 Failed: FK violation was NOT enforced.';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'Test 2 Passed: Caught expected FK violation.';
    END;

    -- Test 3: Negative - Enum Violation
    RAISE NOTICE 'Test 3 (Negative - Enum): Attempting to insert Asset with invalid type CRYPTO...';
    BEGIN
        INSERT INTO public.assets (name, entity_id, type)
        VALUES ('Crypto Asset', v_entity_id, 'CRYPTO');
        RAISE EXCEPTION 'Test 3 Failed: Enum violation was NOT enforced.';
    EXCEPTION WHEN invalid_text_representation THEN
        RAISE NOTICE 'Test 3 Passed: Caught expected Enum violation.';
    WHEN OTHERS THEN
        -- Check for invalid input for enum (Postgres error 22P02)
        IF SQLSTATE = '22P02' THEN
             RAISE NOTICE 'Test 3 Passed: Caught expected Enum violation.';
        ELSE
             RAISE EXCEPTION 'Test 3 Failed: Caught unexpected error: % %', SQLSTATE, SQLERRM;
        END IF;
    END;

    -- Cleanup
    DELETE FROM public.assets WHERE id = v_asset_id;
    DELETE FROM public.entities WHERE id = v_entity_id;
    RAISE NOTICE 'Cleanup complete.';

    RAISE NOTICE 'QA Review Complete: All tests passed.';
END $$;
