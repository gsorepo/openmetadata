import logging
import os
import sys

import pytest

from .integration_base import int_admin_ometa

if not sys.version_info >= (3, 9):
    collect_ignore = ["trino"]


def pytest_configure():
    helpers_path = os.path.abspath(os.path.dirname(__file__) + "/../helpers")
    sys.path.insert(0, helpers_path)


@pytest.fixture(scope="session", autouse=True)
def configure_logging():
    logging.getLogger("sqlfluff").setLevel(logging.CRITICAL)
    logging.getLogger("pytds").setLevel(logging.CRITICAL)


@pytest.fixture(scope="module")
def metadata():
    return int_admin_ometa()


def pytest_pycollect_makeitem(collector, name, obj):
    try:
        if obj.__base__.__name__ in ("BaseModel", "Enum"):
            return []
    except AttributeError:
        pass


@pytest.fixture(scope="session", autouse=sys.version_info >= (3, 9))
def config_testcontatiners():
    from testcontainers.core.config import testcontainers_config

    testcontainers_config.max_tries = 10
