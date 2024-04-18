#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.


"""
Module to manage SSL certificates
"""
import os
import tempfile
from functools import singledispatchmethod
from typing import Union

from metadata.generated.schema.entity.services.connections.database.dorisConnection import (
    DorisConnection,
)
from metadata.generated.schema.entity.services.connections.database.greenplumConnection import (
    GreenplumConnection,
)
from metadata.generated.schema.entity.services.connections.database.mysqlConnection import (
    MysqlConnection,
)
from metadata.generated.schema.entity.services.connections.database.postgresConnection import (
    PostgresConnection,
)
from metadata.generated.schema.entity.services.connections.database.redshiftConnection import (
    RedshiftConnection,
)
from metadata.generated.schema.security.ssl import verifySSLConfig
from metadata.ingestion.connections.builders import init_empty_connection_arguments


class SSLManager:
    "SSL Manager to manage SSL certificates for service connections"

    def __init__(self, ca, key=None, cert=None):
        self.temp_files = []
        self.ca_file_path = self.create_temp_file(ca)
        self.cert_file_path = None
        self.key_file_path = None
        if cert:
            self.cert_file_path = self.create_temp_file(cert)
        if key:
            self.key_file_path = self.create_temp_file(key)

    def create_temp_file(self, content):
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            temp_file.write(content.encode())
            temp_file.close()
        self.temp_files.append(temp_file.name)
        return temp_file.name

    def cleanup_temp_files(self):
        for temp_file in self.temp_files:
            os.remove(temp_file)
        self.temp_files = []

    @staticmethod
    def cleanup_ssl_files_from_connection(connection):
        try:
            ssl = connection.connectionArguments.__root__.get("ssl", {})
            if hasattr(ssl.__root__, "caCertificate"):
                os.remove(ssl.__root__.caCertificate)
            if hasattr(ssl.__root__, "sslCertificate"):
                os.remove(ssl.__root__.sslCertificate)
            if hasattr(ssl.__root__, "sslKey"):
                os.remove(ssl.__root__.sslKey)
        except FileNotFoundError:
            pass

    @singledispatchmethod
    def setup_ssl(self, connection: Union[MysqlConnection, DorisConnection]):

        # Use the temporary file paths for SSL configuration
        connection.connectionArguments = (
            connection.connectionArguments or init_empty_connection_arguments()
        )
        ssl_args = connection.connectionArguments.get("ssl", {})
        if connection.ssl.__root__.caCertificate:
            ssl_args["ssl_ca"] = self.ca_file_path
        if connection.ssl.__root__.sslCertificate:
            ssl_args["ssl_cert"] = self.cert_file_path
        if connection.ssl.__root__.sslKey:
            ssl_args["ssl_key"] = self.key_file_path
        connection.connectionArguments["ssl"] = ssl_args
        return connection

    @setup_ssl.register
    def _(
        self,
        connection: Union[PostgresConnection, RedshiftConnection, GreenplumConnection],
    ):
        if connection.sslMode:
            if not connection.connectionArguments:
                connection.connectionArguments = init_empty_connection_arguments()
            connection.connectionArguments.__root__[
                "sslmode"
            ] = connection.sslMode.value
            if connection.sslMode in (
                verifySSLConfig.SslMode.verify_ca,
                verifySSLConfig.SslMode.verify_full,
            ):
                connection.connectionArguments.__root__[
                    "sslrootcert"
                ] = connection.sslConfig.__root__.caCertificate
        return connection
